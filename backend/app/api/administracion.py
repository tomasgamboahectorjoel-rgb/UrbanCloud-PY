import re

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_, select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.configuracion.base import sesion_bd
from app.modelos.dominio import Area, Auditoria, ConfiguracionSistema, Incidencia, Rol, Usuario
from app.repositorios.consultas import iso, pagina
from app.seguridad.sesiones import exigir_rol, hash_clave

router = APIRouter(prefix="/administracion", dependencies=[Depends(exigir_rol("Administrador"))])
CORREO_VALIDO = re.compile(
    r"^[A-Za-z0-9_+%-]+(?:\.[A-Za-z0-9_+%-]+)*@"
    r"(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+"
    r"[A-Za-z]{2,63}$", re.I,
)


class NuevoUsuario(BaseModel):
    nombre: str = Field(min_length=1, max_length=255)
    email: str = Field(max_length=255)
    password: str = Field(min_length=8)
    password_confirmation: str
    rol_id: int
    area_id: int | None = None
    activo: bool = True


class EstadoUsuario(BaseModel):
    activo: bool


class RestablecerClave(BaseModel):
    password: str = Field(min_length=8, max_length=255)
    password_confirmation: str


class Configuracion(BaseModel):
    umbral_confianza_ia: int = Field(ge=0, le=100)
    alertas_duplicados_activas: bool


def _resumen(db: Session, usuario: Usuario) -> dict:
    rol = db.get(Rol, usuario.rol_id)
    area = db.get(Area, usuario.area_id) if usuario.area_id else None
    return {"id": usuario.id, "nombre": usuario.nombre, "correo": usuario.email,
            "rol": rol.nombre if rol else None, "area": area.nombre if area else None,
            "activo": usuario.activo}


@router.get("/usuarios")
def usuarios(buscar: str | None = Query(default=None, max_length=90), rol_id: int | None = None,
             activo: bool | None = None, page: int = Query(default=1, ge=1), db: Session = Depends(sesion_bd)):
    consulta = select(Usuario)
    if buscar:
        patron = f"%{buscar}%"
        consulta = consulta.where(or_(Usuario.nombre.ilike(patron), Usuario.email.ilike(patron)))
    if rol_id:
        consulta = consulta.where(Usuario.rol_id == rol_id)
    if activo is not None:
        consulta = consulta.where(Usuario.activo == activo)
    return pagina(db, consulta.order_by(Usuario.id), page, lambda item: _resumen(db, item))


@router.post("/usuarios", status_code=201)
def crear_usuario(datos: NuevoUsuario, db: Session = Depends(sesion_bd)):
    correo = datos.email.strip().lower()
    if not CORREO_VALIDO.fullmatch(correo):
        raise HTTPException(422, "Escribe un correo completo y válido, por ejemplo nombre@gmail.com.")
    if datos.password != datos.password_confirmation:
        raise HTTPException(422, "Las contraseñas no coinciden.")
    rol = db.get(Rol, datos.rol_id)
    if rol is None or rol.nombre == "Ciudadano":
        raise HTTPException(422, "Selecciona un rol interno válido.")
    area = db.get(Area, datos.area_id) if datos.area_id else None
    if rol.nombre == "Personal técnico" and (area is None or not area.activo):
        raise HTTPException(422, "Selecciona un área activa para el técnico.")
    if rol.nombre != "Personal técnico" and datos.area_id is not None:
        raise HTTPException(422, "El área solo corresponde al personal técnico.")
    usuario = Usuario(nombre=datos.nombre.strip(), email=correo,
                      password=hash_clave(datos.password), rol_id=rol.id,
                      area_id=datos.area_id, activo=datos.activo)
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(422, "Este correo ya está registrado.") from None
    return {"mensaje": "Usuario interno creado.", "usuario": _resumen(db, usuario)}


@router.patch("/usuarios/{usuario_id}/estado")
def estado_usuario(usuario_id: int, datos: EstadoUsuario,
                   actor: Usuario = Depends(exigir_rol("Administrador")), db: Session = Depends(sesion_bd)):
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(404, "No encontramos lo que buscas.")
    if not datos.activo and usuario.id == actor.id:
        raise HTTPException(422, "No puede desactivar su propia cuenta.")
    usuario.activo = datos.activo
    db.commit()
    return {"mensaje": "Usuario activado." if datos.activo else "Usuario desactivado.",
            "usuario": _resumen(db, usuario)}


@router.patch("/usuarios/{usuario_id}/clave")
def restablecer_clave(usuario_id: int, datos: RestablecerClave,
                     actor: Usuario = Depends(exigir_rol("Administrador")),
                     db: Session = Depends(sesion_bd)):
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(404, "No encontramos lo que buscas.")
    rol = db.get(Rol, usuario.rol_id)
    if rol is None or rol.nombre not in {"Operador", "Supervisor", "Personal técnico"}:
        raise HTTPException(403, "Solo puedes restablecer contraseñas del personal interno.")
    if datos.password != datos.password_confirmation:
        raise HTTPException(422, "Las contraseñas no coinciden.")
    usuario.password = hash_clave(datos.password)
    from app.modelos.dominio import SesionRenovacion, ahora
    db.query(SesionRenovacion).filter(SesionRenovacion.usuario_id == usuario.id,
                                      SesionRenovacion.revocada_en.is_(None)).update(
        {"revocada_en": ahora()}, synchronize_session=False)
    db.add(Auditoria(usuario_id=actor.id, accion="clave_personal_restablecida",
                     entidad="usuarios", entidad_id=str(usuario.id)))
    db.commit()
    return {"mensaje": "Contraseña del trabajador actualizada."}


@router.get("/configuracion")
def configuracion(db: Session = Depends(sesion_bd)):
    filas = db.scalars(select(ConfiguracionSistema).order_by(ConfiguracionSistema.clave)).all()
    return [{"clave": fila.clave, "valor": fila.valor, "descripcion": fila.descripcion} for fila in filas]


@router.patch("/configuracion")
def guardar_configuracion(datos: Configuracion,
                          actor: Usuario = Depends(exigir_rol("Administrador")), db: Session = Depends(sesion_bd)):
    claves = {"UMBRAL_CONFIANZA_IA": str(datos.umbral_confianza_ia),
              "ALERTAS_DUPLICADOS_ACTIVAS": "true" if datos.alertas_duplicados_activas else "false"}
    anteriores = {}
    for clave, valor in claves.items():
        fila = db.scalar(select(ConfiguracionSistema).where(ConfiguracionSistema.clave == clave))
        if fila is None:
            raise HTTPException(503, "Configuración del sistema incompleta.")
        anteriores[clave] = fila.valor
        fila.valor = valor
    db.add(Auditoria(usuario_id=actor.id, accion="configuracion_actualizada",
                     entidad="configuraciones_sistema", valores_anteriores=anteriores,
                     valores_nuevos=datos.model_dump()))
    db.commit()
    return configuracion(db)


@router.get("/auditoria")
def auditoria(page: int = Query(default=1, ge=1), db: Session = Depends(sesion_bd)):
    def transformar(item: Auditoria):
        usuario = db.get(Usuario, item.usuario_id) if item.usuario_id else None
        incidencia = db.get(Incidencia, item.incidencia_id) if item.incidencia_id else None
        return {"id": item.id, "fecha": iso(item.created_at), "accion": item.accion,
                "responsable": usuario.nombre if usuario else None,
                "incidencia": incidencia.codigo if incidencia else None,
                "detalle": item.valores_nuevos}
    return pagina(db, select(Auditoria).order_by(Auditoria.id.desc()), page, transformar)
