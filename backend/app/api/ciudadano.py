import math
import re
import uuid
import unicodedata

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.configuracion.base import sesion_bd
from app.modelos.dominio import (
    ConfiguracionSistema, EstadoIncidencia, Incidencia, SeguidorIncidencia, Usuario,
)
from app.repositorios.consultas import detalle, pagina, resumen
from app.seguridad.sesiones import exigir_rol
from app.servicios.flujo import solicitar_revision
from app.servicios.ia import ErrorIntegracionIA
from app.servicios.incidencias import crear_reporte, LIMITE_IMAGEN

router = APIRouter(dependencies=[Depends(exigir_rol("Ciudadano"))])


def _terminos(titulo: str) -> set[str]:
    """Normaliza acentos y plurales simples para la alerta orientativa."""
    sin_acentos = "".join(letra for letra in unicodedata.normalize("NFD", titulo.lower())
                          if unicodedata.category(letra) != "Mn")
    resultado = set()
    for palabra in re.findall(r"[a-z0-9]+", sin_acentos):
        if len(palabra) < 4:
            continue
        if palabra.endswith("s") and len(palabra) > 4:
            palabra = palabra[:-1]
        resultado.add(palabra)
    return resultado


class MotivoRevision(BaseModel):
    motivo: str = Field(min_length=10, max_length=2000)


@router.post("/incidencias")
async def crear(
    titulo: str = Form(min_length=1, max_length=90),
    descripcion: str = Form(min_length=15, max_length=800),
    distrito_id: int = Form(), direccion: str = Form(min_length=1, max_length=255),
    latitud: float | None = Form(default=None, ge=-90, le=90),
    longitud: float | None = Form(default=None, ge=-180, le=180),
    fotografia: UploadFile = File(),
    usuario: Usuario = Depends(exigir_rol("Ciudadano")), db: Session = Depends(sesion_bd),
):
    imagen = await fotografia.read(LIMITE_IMAGEN + 1)
    try:
        resultado, estado = crear_reporte(db, usuario, {
            "titulo": titulo, "descripcion": descripcion, "distrito_id": distrito_id,
            "direccion": direccion, "latitud": latitud, "longitud": longitud,
        }, imagen, fotografia.content_type or "")
    except ErrorIntegracionIA:
        raise HTTPException(503, "No se pudo analizar el reporte en este momento. Inténtalo de nuevo.") from None
    return JSONResponse(status_code=estado, content=resultado)


def _filtros(consulta, buscar: str | None, estado: str | None):
    if buscar:
        patron = f"%{buscar}%"
        consulta = consulta.where(or_(Incidencia.codigo.ilike(patron), Incidencia.titulo.ilike(patron),
                                      Incidencia.direccion.ilike(patron)))
    if estado:
        consulta = consulta.join(EstadoIncidencia).where(EstadoIncidencia.nombre == estado)
    return consulta


@router.get("/incidencias/mias")
def mias(buscar: str | None = Query(default=None, max_length=90), estado: str | None = Query(default=None, max_length=50),
         page: int = Query(default=1, ge=1), usuario: Usuario = Depends(exigir_rol("Ciudadano")),
         db: Session = Depends(sesion_bd)):
    consulta = _filtros(select(Incidencia).where(Incidencia.ciudadano_id == usuario.id), buscar, estado)
    return pagina(db, consulta.order_by(Incidencia.created_at.desc()), page, lambda item: resumen(db, item))


@router.get("/incidencias/seguidas")
def seguidas(buscar: str | None = Query(default=None, max_length=90), estado: str | None = Query(default=None, max_length=50),
             page: int = Query(default=1, ge=1), usuario: Usuario = Depends(exigir_rol("Ciudadano")),
             db: Session = Depends(sesion_bd)):
    consulta = select(Incidencia).join(SeguidorIncidencia).where(SeguidorIncidencia.ciudadano_id == usuario.id)
    return pagina(db, _filtros(consulta, buscar, estado).order_by(Incidencia.created_at.desc()),
                  page, lambda item: resumen(db, item))


@router.get("/incidencias/similares")
def similares(titulo: str = Query(min_length=4, max_length=90), distrito_id: int = Query(),
              latitud: float = Query(ge=-90, le=90), longitud: float = Query(ge=-180, le=180),
              db: Session = Depends(sesion_bd)):
    config = db.scalar(select(ConfiguracionSistema.valor)
                       .where(ConfiguracionSistema.clave == "ALERTAS_DUPLICADOS_ACTIVAS"))
    if config != "true":
        return {"datos": [], "busqueda_activa": False}
    terminos = _terminos(titulo)
    cerrado = db.scalar(select(EstadoIncidencia.id).where(EstadoIncidencia.nombre == "Cerrado"))
    # Primero se acota por coordenadas; ningún reporte antiguo cercano queda fuera.
    delta_latitud = 320 / 110_000
    delta_longitud = 320 / max(1, 110_000 * math.cos(math.radians(latitud)))
    consulta = select(Incidencia).where(
        Incidencia.distrito_id == distrito_id,
        Incidencia.latitud.between(latitud - delta_latitud, latitud + delta_latitud),
        Incidencia.longitud.between(longitud - delta_longitud, longitud + delta_longitud),
        Incidencia.estado_id != cerrado,
    ).order_by(Incidencia.created_at.desc())
    encontrados = []
    for item in db.scalars(consulta):
        lat1, lon1, lat2, lon2 = map(math.radians, [latitud, longitud, float(item.latitud), float(item.longitud)])
        distancia = 2 * 6371000 * math.asin(min(1, math.sqrt(
            math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2)))
        palabras = _terminos(item.titulo)
        if distancia <= 300 and terminos & palabras:
            encontrados.append({"id": str(item.id), "codigo": item.codigo, "titulo": item.titulo,
                                "estado": db.get(EstadoIncidencia, item.estado_id).nombre,
                                "distancia_metros": round(distancia)})
        if len(encontrados) == 5:
            break
    return {"datos": encontrados, "busqueda_activa": True}


@router.get("/incidencias/seguidas/{incidencia_id}")
def detalle_seguida(incidencia_id: uuid.UUID, request: Request,
                    usuario: Usuario = Depends(exigir_rol("Ciudadano")), db: Session = Depends(sesion_bd)):
    seguimiento = db.scalar(select(SeguidorIncidencia).where(SeguidorIncidencia.incidencia_id == incidencia_id,
                                                              SeguidorIncidencia.ciudadano_id == usuario.id))
    if seguimiento is None:
        raise HTTPException(403, "No tienes permiso para ver este reporte.")
    incidencia = db.get(Incidencia, incidencia_id)
    if incidencia is None:
        raise HTTPException(404, "No encontramos lo que buscas.")
    return detalle(db, incidencia, str(request.base_url), ciudadano=True)


@router.get("/incidencias/{incidencia_id}")
def propia(incidencia_id: uuid.UUID, request: Request,
           usuario: Usuario = Depends(exigir_rol("Ciudadano")), db: Session = Depends(sesion_bd)):
    incidencia = db.get(Incidencia, incidencia_id)
    if incidencia is None:
        raise HTTPException(404, "No encontramos lo que buscas.")
    if incidencia.ciudadano_id != usuario.id:
        raise HTTPException(403, "No tienes permiso para ver este reporte.")
    return detalle(db, incidencia, str(request.base_url), ciudadano=True)


@router.post("/incidencias/{incidencia_id}/seguir")
def seguir(incidencia_id: uuid.UUID, usuario: Usuario = Depends(exigir_rol("Ciudadano")),
           db: Session = Depends(sesion_bd)):
    incidencia = db.get(Incidencia, incidencia_id)
    if incidencia is None:
        raise HTTPException(404, "No encontramos lo que buscas.")
    if incidencia.ciudadano_id == usuario.id:
        raise HTTPException(422, "Ya es propietario de esta incidencia.")
    existente = db.scalar(select(SeguidorIncidencia).where(SeguidorIncidencia.incidencia_id == incidencia_id,
                                                            SeguidorIncidencia.ciudadano_id == usuario.id))
    if existente:
        return {"mensaje": "Ya seguía esta incidencia.", "codigo": incidencia.codigo}
    db.add(SeguidorIncidencia(incidencia_id=incidencia_id, ciudadano_id=usuario.id))
    db.commit()
    return JSONResponse(status_code=201, content={"mensaje": "Ahora sigue esta incidencia.",
                                                  "codigo": incidencia.codigo})


@router.post("/incidencias/{incidencia_id}/solicitar-revision")
def revision(incidencia_id: uuid.UUID, datos: MotivoRevision,
             usuario: Usuario = Depends(exigir_rol("Ciudadano")), db: Session = Depends(sesion_bd)):
    return solicitar_revision(db, incidencia_id, usuario, datos.motivo)
