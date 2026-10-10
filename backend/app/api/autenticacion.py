import re

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.configuracion.base import sesion_bd
from app.modelos.dominio import Rol, SesionRenovacion, Usuario, ahora
from app.seguridad.sesiones import (
    cerrar_sesion, hash_clave, iniciar_sesion, renovar_sesion, resumen_usuario,
    usuario_actual, verificar_clave, rol_usuario,
)
from app.servicios.correo import consumir, emitir

router = APIRouter()
CORREO_VALIDO = re.compile(
    r"^[A-Za-z0-9_+%-]+(?:\.[A-Za-z0-9_+%-]+)*@"
    r"(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+"
    r"[A-Za-z]{2,63}$", re.I,
)
DESTINOS = {"Ciudadano": "/ciudadano", "Operador": "/operador", "Supervisor": "/supervisor",
            "Personal técnico": "/tecnico", "Administrador": "/administrador"}


class Registro(BaseModel):
    nombre: str = Field(min_length=1, max_length=255)
    email: str = Field(max_length=255)
    password: str = Field(min_length=8)
    password_confirmation: str


class Credenciales(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    token: str


class SolicitudRecuperacion(BaseModel):
    email: str = Field(max_length=255)


class NuevaClave(BaseModel):
    password: str = Field(min_length=8, max_length=255)
    password_confirmation: str


class ConfirmarRecuperacion(NuevaClave):
    token: str


class CambioClave(NuevaClave):
    current_password: str


@router.get("/login")
def login_requerido():
    raise HTTPException(401, "Debe iniciar sesión.")


def _sesion_activa(request: Request, db: Session) -> bool:
    try:
        usuario_actual(request, db)
        return True
    except HTTPException:
        return False


@router.post("/registro", status_code=201)
def registrar(datos: Registro, request: Request, db: Session = Depends(sesion_bd)):
    if _sesion_activa(request, db):
        raise HTTPException(409, "Cierre la sesión antes de registrar otra cuenta.")
    correo = datos.email.strip().lower()
    if not CORREO_VALIDO.fullmatch(correo):
        raise HTTPException(422, "Escribe un correo completo y válido, por ejemplo nombre@gmail.com.")
    if datos.password != datos.password_confirmation:
        raise HTTPException(422, "Las contraseñas no coinciden.")
    rol = db.scalar(select(Rol).where(Rol.nombre == "Ciudadano"))
    if rol is None:
        raise HTTPException(503, "No está disponible el registro en este momento.")
    usuario = Usuario(nombre=datos.nombre.strip(), email=correo,
                      password=hash_clave(datos.password), rol_id=rol.id, activo=True)
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(422, "Este correo ya está registrado. Inicia sesión o usa otro correo.") from None
    enviado = emitir(db, usuario, "verificar")
    return {"mensaje": "Cuenta ciudadana creada.", "usuario": resumen_usuario(db, usuario),
            "correo_verificacion_enviado": enviado}


@router.post("/correo/verificacion/reenviar")
def reenviar_verificacion(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(sesion_bd)):
    if rol_usuario(db, usuario) != "Ciudadano":
        raise HTTPException(403, "No tienes permiso para realizar esta acción.")
    if usuario.email_verified_at:
        return {"mensaje": "Tu correo ya está verificado.", "enviado": False}
    enviado = emitir(db, usuario, "verificar")
    return {"mensaje": "Revisa tu correo para verificar la cuenta." if enviado
            else "No pudimos enviar el correo. Inténtalo más tarde.", "enviado": enviado}


@router.post("/correo/verificar")
def verificar_correo(datos: Token, db: Session = Depends(sesion_bd)):
    usuario = consumir(db, datos.token, "verificar")
    if usuario is None:
        raise HTTPException(422, "El enlace no es válido o ya venció.")
    usuario.email_verified_at = ahora()
    db.commit()
    return {"mensaje": "Correo verificado correctamente."}


@router.post("/clave/recuperacion/solicitar")
def solicitar_recuperacion(datos: SolicitudRecuperacion, db: Session = Depends(sesion_bd)):
    correo = datos.email.strip().lower()
    usuario = db.scalar(select(Usuario).where(Usuario.email == correo)) if CORREO_VALIDO.fullmatch(correo) else None
    if usuario and usuario.activo and usuario.email_verified_at and rol_usuario(db, usuario) == "Ciudadano":
        emitir(db, usuario, "recuperar")
    # No se revela si la dirección existe o está verificada.
    return {"mensaje": "Si la cuenta ciudadana tiene el correo verificado, recibirás un enlace para restablecer la contraseña."}


@router.post("/clave/recuperacion/confirmar")
def confirmar_recuperacion(datos: ConfirmarRecuperacion, db: Session = Depends(sesion_bd)):
    if datos.password != datos.password_confirmation:
        raise HTTPException(422, "Las contraseñas no coinciden.")
    usuario = consumir(db, datos.token, "recuperar")
    if usuario is None or not usuario.email_verified_at or rol_usuario(db, usuario) != "Ciudadano":
        raise HTTPException(422, "El enlace no es válido o ya venció.")
    usuario.password = hash_clave(datos.password)
    db.execute(update(SesionRenovacion).where(SesionRenovacion.usuario_id == usuario.id,
                                               SesionRenovacion.revocada_en.is_(None))
               .values(revocada_en=ahora()))
    db.commit()
    return {"mensaje": "Contraseña restablecida. Ya puedes iniciar sesión."}


@router.post("/cuenta/cambiar-clave")
def cambiar_clave(datos: CambioClave, usuario: Usuario = Depends(usuario_actual),
                 db: Session = Depends(sesion_bd)):
    if rol_usuario(db, usuario) not in {"Ciudadano", "Administrador"}:
        raise HTTPException(403, "Solo ciudadanos y administradores pueden cambiar su contraseña.")
    if not verificar_clave(datos.current_password, usuario.password):
        raise HTTPException(422, "La contraseña actual no es correcta.")
    if datos.password != datos.password_confirmation:
        raise HTTPException(422, "Las contraseñas no coinciden.")
    usuario.password = hash_clave(datos.password)
    db.execute(update(SesionRenovacion).where(SesionRenovacion.usuario_id == usuario.id,
                                               SesionRenovacion.revocada_en.is_(None))
               .values(revocada_en=ahora()))
    db.commit()
    return {"mensaje": "Contraseña actualizada. Inicia sesión nuevamente."}


@router.post("/login")
def login(datos: Credenciales, request: Request, respuesta: Response, db: Session = Depends(sesion_bd)):
    if _sesion_activa(request, db):
        raise HTTPException(409, "Ya existe una sesión activa.")
    usuario = db.scalar(select(Usuario).where(Usuario.email == datos.email.strip().lower()))
    if usuario is None or not usuario.activo or not verificar_clave(datos.password, usuario.password):
        raise HTTPException(422, "Las credenciales no son válidas o la cuenta está inactiva.")
    iniciar_sesion(respuesta, db, usuario)
    db.commit()
    rol = resumen_usuario(db, usuario)
    return {"mensaje": "Sesión iniciada.", "usuario": rol, "destino": DESTINOS.get(rol["rol"])}


@router.post("/auth/refresh")
def refresh(request: Request, respuesta: Response, db: Session = Depends(sesion_bd)):
    renovar_sesion(respuesta, db, request.cookies.get("uc_refresh"))
    return {"mensaje": "Sesión renovada."}


@router.post("/logout")
def logout(request: Request, respuesta: Response, db: Session = Depends(sesion_bd)):
    cerrar_sesion(respuesta, db, request.cookies.get("uc_refresh"))
    return {"mensaje": "Sesión cerrada."}


@router.get("/dashboard")
def dashboard(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(sesion_bd)):
    datos = resumen_usuario(db, usuario)
    return {"usuario": datos, "destino": DESTINOS.get(datos["rol"])}


@router.get("/dashboard/{panel}")
def panel_rol(panel: str, usuario: Usuario = Depends(usuario_actual), db: Session = Depends(sesion_bd)):
    ruta = {"ciudadano": "Ciudadano", "operador": "Operador", "supervisor": "Supervisor",
            "tecnico": "Personal técnico", "administrador": "Administrador"}
    rol = resumen_usuario(db, usuario)["rol"]
    if ruta.get(panel) != rol:
        raise HTTPException(403, "No tienes permiso para realizar esta acción.")
    return {"mensaje": "Acceso autorizado.", "rol": rol}
