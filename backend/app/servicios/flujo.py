"""Transiciones de estado de las incidencias, verificadas contra el servicio original.

La referencia es ServicioFlujoIncidencias.php, del proyecto original en Laravel.
"""

import uuid
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modelos.dominio import (
    ActualizacionIncidencia, Area, AsignacionIncidencia, Auditoria, Categoria,
    EstadoIncidencia, EvidenciaIncidencia, HistorialEstadoIncidencia, Incidencia,
    Prioridad, Rol, Usuario, ahora,
)
from app.servicios.almacenamiento import almacenamiento
from app.servicios.incidencias import PLAZOS_HORAS, validar_imagen
from app.servicios.notificaciones import notificar_evento


def _bloquear(db: Session, identificador: uuid.UUID) -> Incidencia:
    incidencia = db.scalar(select(Incidencia).where(Incidencia.id == identificador).with_for_update())
    if incidencia is None:
        raise HTTPException(404, "No encontramos lo que buscas.")
    return incidencia


def _nombre_estado(db: Session, incidencia: Incidencia) -> str:
    estado = db.get(EstadoIncidencia, incidencia.estado_id)
    return estado.nombre if estado else ""


def _exigir(db: Session, incidencia: Incidencia, permitidos: set[str]) -> None:
    actual = _nombre_estado(db, incidencia)
    if actual not in permitidos:
        raise HTTPException(422, f"La incidencia está en {actual} y no permite esta operación.")


def _transicion(db: Session, incidencia: Incidencia, destino: str, actor: Usuario,
                comentario: str | None, mensaje_publico: str | None = None) -> None:
    estado = db.scalar(select(EstadoIncidencia).where(EstadoIncidencia.nombre == destino))
    if estado is None:
        raise HTTPException(503, "Estado de incidencia no configurado.")
    anterior = incidencia.estado_id
    incidencia.estado_id = estado.id
    db.add(HistorialEstadoIncidencia(incidencia_id=incidencia.id,
                                    estado_anterior_id=anterior, estado_nuevo_id=estado.id,
                                    cambiado_por=actor.id, comentario=comentario))
    db.flush()
    notificar_evento(db, incidencia, destino, mensaje_publico)


def _auditar(db: Session, incidencia: Incidencia, actor: Usuario, accion: str,
             anteriores: dict | None = None, nuevos: dict | None = None) -> None:
    db.add(Auditoria(usuario_id=actor.id, incidencia_id=incidencia.id,
                     accion=accion, entidad="incidencias", entidad_id=str(incidencia.id),
                     valores_anteriores=anteriores, valores_nuevos=nuevos))


def _resultado(db: Session, incidencia: Incidencia) -> dict:
    return {"codigo": incidencia.codigo, "estado": _nombre_estado(db, incidencia)}


def revisar(db: Session, identificador: uuid.UUID, operador: Usuario, datos: dict) -> dict:
    incidencia = _bloquear(db, identificador)
    _exigir(db, incidencia, {"En revisión"})
    for modelo, campo in ((Categoria, "categoria_id"), (Prioridad, "prioridad_id"), (Area, "area_id")):
        elemento = db.get(modelo, datos[campo])
        if elemento is None or (hasattr(elemento, "activo") and not elemento.activo):
            raise HTTPException(422, "La clasificación seleccionada no está disponible.")
    anterior = {clave: getattr(incidencia, clave) for clave in ("categoria_id", "prioridad_id", "area_id")}
    nuevo = {clave: datos[clave] for clave in anterior}
    cambio = anterior != nuevo
    if cambio and len((datos.get("motivo") or "").strip()) < 10:
        raise HTTPException(422, "Explique la corrección con al menos 10 caracteres.")
    for clave, valor in nuevo.items():
        setattr(incidencia, clave, valor)
    if anterior["prioridad_id"] != nuevo["prioridad_id"]:
        prioridad = db.get(Prioridad, incidencia.prioridad_id)
        incidencia.fecha_limite = ahora() + timedelta(hours=PLAZOS_HORAS[prioridad.nombre])
    _transicion(db, incidencia, "Derivado", operador,
                datos.get("motivo") if cambio else "Clasificación confirmada y derivada.")
    _auditar(db, incidencia, operador, "clasificacion_corregida_y_derivada" if cambio
             else "clasificacion_confirmada_y_derivada", anterior, nuevo)
    db.commit()
    return _resultado(db, incidencia)


def asignar(db: Session, identificador: uuid.UUID, supervisor: Usuario, datos: dict) -> dict:
    incidencia = _bloquear(db, identificador)
    _exigir(db, incidencia, {"Derivado", "Asignado", "En atención", "Impedido"})
    tecnico = db.get(Usuario, datos["tecnico_id"])
    rol = db.get(Rol, tecnico.rol_id) if tecnico else None
    if tecnico is None or not tecnico.activo or rol is None or rol.nombre != "Personal técnico" \
            or incidencia.area_id is None or tecnico.area_id != incidencia.area_id:
        raise HTTPException(422, "El técnico debe estar activo y pertenecer al área responsable.")
    anterior = db.scalar(select(AsignacionIncidencia)
                         .where(AsignacionIncidencia.incidencia_id == incidencia.id,
                                AsignacionIncidencia.activa.is_(True)).with_for_update())
    reasignacion = db.scalar(select(AsignacionIncidencia.id)
                             .where(AsignacionIncidencia.incidencia_id == incidencia.id).limit(1)) is not None
    if anterior:
        if anterior.tecnico_id == tecnico.id:
            raise HTTPException(422, "El técnico ya tiene la asignación activa.")
        anterior.activa = False
        anterior.fecha_fin = ahora()
    db.add(AsignacionIncidencia(incidencia_id=incidencia.id, tecnico_id=tecnico.id,
                                asignado_por=supervisor.id, fecha_asignacion=ahora(), activa=True))
    db.flush()
    comentario = ("Reasignado a " if reasignacion else "Asignado a ") + tecnico.nombre
    comentario += f": {datos['comentario']}" if datos.get("comentario") else "."
    _transicion(db, incidencia, "Asignado", supervisor, comentario)
    _auditar(db, incidencia, supervisor, "reasignacion" if reasignacion else "asignacion",
             {"tecnico_id": anterior.tecnico_id if anterior else None}, {"tecnico_id": tecnico.id})
    db.commit()
    return {**_resultado(db, incidencia), "tecnico_id": tecnico.id}


def actualizar_tarea(db: Session, identificador: uuid.UUID, tecnico: Usuario,
                     datos: dict, foto: bytes | None, mime: str | None) -> dict:
    incidencia = _bloquear(db, identificador)
    asignacion = db.scalar(select(AsignacionIncidencia)
                           .where(AsignacionIncidencia.incidencia_id == incidencia.id,
                                  AsignacionIncidencia.tecnico_id == tecnico.id,
                                  AsignacionIncidencia.activa.is_(True)).with_for_update())
    if asignacion is None:
        raise HTTPException(403, "La tarea no está asignada a este técnico.")
    accion = datos["accion"]
    permitidos = {"en_camino": {"Asignado"}, "iniciar": {"Asignado"},
                  "atendido": {"En atención"}, "impedido": {"Asignado", "En atención"}}
    if accion not in permitidos:
        raise HTTPException(422, "Acción no válida.")
    _exigir(db, incidencia, permitidos[accion])
    ruta = None
    disco = almacenamiento()
    if foto is not None:
        extension = validar_imagen(foto, mime or "", webp=True, limite=5 * 1024 * 1024)
        ruta = f"atenciones/{ahora():%Y/%m}/{uuid.uuid4()}.{extension}"
        disco.guardar(ruta, foto, mime or "")
    try:
        destinos = {"iniciar": "En atención", "atendido": "Atendido", "impedido": "Impedido"}
        estado_id = None
        if accion in destinos:
            _transicion(db, incidencia, destinos[accion], tecnico, datos["comentario"])
            estado_id = incidencia.estado_id
        comentario = f"En camino: {datos['comentario']}" if accion == "en_camino" else datos["comentario"]
        db.add(ActualizacionIncidencia(incidencia_id=incidencia.id, usuario_id=tecnico.id,
                                       estado_id=estado_id, comentario=comentario))
        if ruta:
            db.add(EvidenciaIncidencia(incidencia_id=incidencia.id, usuario_id=tecnico.id,
                                       tipo=datos.get("tipo_evidencia") or
                                       ("CIERRE" if accion == "atendido" else "ATENCION"),
                                       ruta_archivo=ruta))
        if accion == "impedido":
            asignacion.activa = False
            asignacion.fecha_fin = ahora()
            _auditar(db, incidencia, tecnico, "impedimento", nuevos={"motivo": datos["comentario"]})
        db.commit()
        return _resultado(db, incidencia)
    except Exception:
        db.rollback()
        if ruta:
            disco.eliminar(ruta)
        raise


def devolver_operador(db: Session, identificador: uuid.UUID, supervisor: Usuario, motivo: str) -> dict:
    incidencia = _bloquear(db, identificador)
    _exigir(db, incidencia, {"Impedido"})
    _transicion(db, incidencia, "En revisión", supervisor, motivo)
    _auditar(db, incidencia, supervisor, "devuelto_a_operador", nuevos={"motivo": motivo})
    db.commit()
    return _resultado(db, incidencia)


def cerrar(db: Session, identificador: uuid.UUID, supervisor: Usuario, comentario: str | None) -> dict:
    incidencia = _bloquear(db, identificador)
    _exigir(db, incidencia, {"Atendido"})
    incidencia.fecha_cierre = ahora()
    _transicion(db, incidencia, "Cerrado", supervisor, comentario or "Cierre aprobado.")
    asignaciones = db.scalars(select(AsignacionIncidencia)
                              .where(AsignacionIncidencia.incidencia_id == incidencia.id,
                                     AsignacionIncidencia.activa.is_(True))).all()
    for asignacion in asignaciones:
        asignacion.activa = False
        asignacion.fecha_fin = ahora()
    _auditar(db, incidencia, supervisor, "cierre_aprobado",
             nuevos={"fecha_cierre": incidencia.fecha_cierre.isoformat()})
    db.commit()
    return _resultado(db, incidencia)


def solicitar_revision(db: Session, identificador: uuid.UUID, ciudadano: Usuario, motivo: str) -> dict:
    incidencia = _bloquear(db, identificador)
    if incidencia.ciudadano_id != ciudadano.id:
        raise HTTPException(403, "No tienes permiso para realizar esta acción.")
    _exigir(db, incidencia, {"Cerrado"})
    incidencia.fecha_cierre = None
    _transicion(db, incidencia, "Revisión solicitada", ciudadano, motivo)
    _auditar(db, incidencia, ciudadano, "revision_solicitada", nuevos={"motivo": motivo})
    db.commit()
    return _resultado(db, incidencia)


def resolver_revision(db: Session, identificador: uuid.UUID, operador: Usuario,
                      decision: str, motivo: str) -> dict:
    incidencia = _bloquear(db, identificador)
    _exigir(db, incidencia, {"Revisión solicitada"})
    if decision == "reabrir":
        _transicion(db, incidencia, "En revisión", operador, motivo,
                    "Tu solicitud fue aceptada. Se reabre la incidencia: " + motivo)
    elif decision == "mantener_cierre":
        incidencia.fecha_cierre = ahora()
        _transicion(db, incidencia, "Cerrado", operador, motivo,
                    "Tu solicitud fue revisada. Se mantiene el cierre: " + motivo)
    else:
        raise HTTPException(422, "Decisión no válida.")
    _auditar(db, incidencia, operador, "revision_" + decision, nuevos={"motivo": motivo})
    db.commit()
    return _resultado(db, incidencia)
