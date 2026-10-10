"""Mapeo de las tablas existentes en database/urbancloud_ai.sql.

No se usa create_all contra la base de datos real. La única tabla nueva es
sesiones_renovacion, creada por una migración explícita de Alembic.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    JSON, BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, Index,
    Integer, Numeric, SmallInteger, String, Text, UniqueConstraint, Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.configuracion.base import Base


def ahora() -> datetime:
    return datetime.now(timezone.utc)


EnteroGrande = BigInteger().with_variant(Integer, "sqlite")
JsonCompatible = JSON().with_variant(JSONB, "postgresql")


class ConFechas:
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=ahora)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=ahora, onupdate=ahora)


class Rol(ConFechas, Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(EnteroGrande, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255), unique=True)
    descripcion: Mapped[str | None] = mapped_column(Text)


class Area(ConFechas, Base):
    __tablename__ = "areas"
    id: Mapped[int] = mapped_column(EnteroGrande, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255), unique=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Categoria(ConFechas, Base):
    __tablename__ = "categorias"
    id: Mapped[int] = mapped_column(EnteroGrande, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255), unique=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Prioridad(Base):
    __tablename__ = "prioridades"
    id: Mapped[int] = mapped_column(EnteroGrande, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255), unique=True)
    nivel: Mapped[int] = mapped_column(SmallInteger, unique=True)


class EstadoIncidencia(ConFechas, Base):
    __tablename__ = "estados_incidencia"
    id: Mapped[int] = mapped_column(EnteroGrande, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255), unique=True)
    descripcion: Mapped[str | None] = mapped_column(Text)


class Distrito(ConFechas, Base):
    __tablename__ = "distritos"
    __table_args__ = (UniqueConstraint("nombre", "provincia", "departamento"),)
    id: Mapped[int] = mapped_column(EnteroGrande, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255))
    provincia: Mapped[str] = mapped_column(String(255))
    departamento: Mapped[str] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class ConfiguracionSistema(ConFechas, Base):
    __tablename__ = "configuraciones_sistema"
    id: Mapped[int] = mapped_column(EnteroGrande, primary_key=True)
    clave: Mapped[str] = mapped_column(String(255), unique=True)
    valor: Mapped[str] = mapped_column(Text)
    descripcion: Mapped[str | None] = mapped_column(Text)


class Usuario(ConFechas, Base):
    __tablename__ = "usuarios"
    id: Mapped[int] = mapped_column(EnteroGrande, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    password: Mapped[str] = mapped_column(String(255))
    rol_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    area_id: Mapped[int | None] = mapped_column(ForeignKey("areas.id"))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    remember_token: Mapped[str | None] = mapped_column(String(100))


class TokenCorreo(Base):
    __tablename__ = "tokens_correo"
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    proposito: Mapped[str] = mapped_column(String(20))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    vence_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    usado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)


class Incidencia(ConFechas, Base):
    __tablename__ = "incidencias"
    __table_args__ = (
        Index("incidencias_estado_distrito_idx", "estado_id", "distrito_id"),
        Index("incidencias_area_prioridad_idx", "area_id", "prioridad_id"),
        Index("incidencias_ciudadano_fecha_idx", "ciudadano_id", "created_at"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo: Mapped[str] = mapped_column(String(255), unique=True)
    ciudadano_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    titulo: Mapped[str] = mapped_column(String(255))
    descripcion: Mapped[str] = mapped_column(Text)
    categoria_id: Mapped[int | None] = mapped_column(ForeignKey("categorias.id"))
    prioridad_id: Mapped[int | None] = mapped_column(ForeignKey("prioridades.id"))
    area_id: Mapped[int | None] = mapped_column(ForeignKey("areas.id"))
    estado_id: Mapped[int] = mapped_column(ForeignKey("estados_incidencia.id"))
    distrito_id: Mapped[int] = mapped_column(ForeignKey("distritos.id"))
    direccion: Mapped[str] = mapped_column(String(255))
    latitud: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    longitud: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    fecha_limite: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fecha_cierre: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ValidacionReporte(ConFechas, Base):
    __tablename__ = "validaciones_reporte"
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ciudadano_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    incidencia_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("incidencias.id"))
    titulo: Mapped[str] = mapped_column(String(255))
    descripcion: Mapped[str] = mapped_column(Text)
    ruta_imagen: Mapped[str] = mapped_column(String(255))
    es_valido: Mapped[bool] = mapped_column(Boolean)
    motivo: Mapped[str | None] = mapped_column(Text)
    confianza: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    respuesta_modelo: Mapped[dict | None] = mapped_column(JsonCompatible)


class AnalisisIA(ConFechas, Base):
    __tablename__ = "analisis_ia"
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incidencia_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidencias.id"))
    categoria_sugerida_id: Mapped[int | None] = mapped_column(ForeignKey("categorias.id"))
    prioridad_sugerida_id: Mapped[int | None] = mapped_column(ForeignKey("prioridades.id"))
    area_sugerida_id: Mapped[int | None] = mapped_column(ForeignKey("areas.id"))
    confianza: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    respuesta_modelo: Mapped[dict | None] = mapped_column(JsonCompatible)


class EvidenciaIncidencia(ConFechas, Base):
    __tablename__ = "evidencias_incidencia"
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incidencia_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidencias.id"))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    tipo: Mapped[str] = mapped_column(String(20))
    ruta_archivo: Mapped[str] = mapped_column(String(255))
    descripcion: Mapped[str | None] = mapped_column(Text)


class HistorialEstadoIncidencia(Base):
    __tablename__ = "historial_estados_incidencia"
    id: Mapped[int] = mapped_column(EnteroGrande, primary_key=True)
    incidencia_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidencias.id"))
    estado_anterior_id: Mapped[int | None] = mapped_column(ForeignKey("estados_incidencia.id"))
    estado_nuevo_id: Mapped[int] = mapped_column(ForeignKey("estados_incidencia.id"))
    cambiado_por: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    comentario: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)


class AsignacionIncidencia(ConFechas, Base):
    __tablename__ = "asignaciones_incidencia"
    id: Mapped[int] = mapped_column(EnteroGrande, primary_key=True)
    incidencia_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidencias.id"))
    tecnico_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    asignado_por: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    fecha_asignacion: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    fecha_fin: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    activa: Mapped[bool] = mapped_column(Boolean, default=True)


class ActualizacionIncidencia(ConFechas, Base):
    __tablename__ = "actualizaciones_incidencia"
    id: Mapped[int] = mapped_column(EnteroGrande, primary_key=True)
    incidencia_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidencias.id"))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    estado_id: Mapped[int | None] = mapped_column(ForeignKey("estados_incidencia.id"))
    comentario: Mapped[str] = mapped_column(Text)


class SeguidorIncidencia(ConFechas, Base):
    __tablename__ = "seguidores_incidencia"
    __table_args__ = (UniqueConstraint("incidencia_id", "ciudadano_id"),)
    id: Mapped[int] = mapped_column(EnteroGrande, primary_key=True)
    incidencia_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidencias.id"))
    ciudadano_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))


class Notificacion(ConFechas, Base):
    __tablename__ = "notificaciones_incidencia"
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    incidencia_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("incidencias.id"))
    titulo: Mapped[str] = mapped_column(String(255))
    mensaje: Mapped[str] = mapped_column(Text)
    leida_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Auditoria(Base):
    __tablename__ = "auditorias"
    id: Mapped[int] = mapped_column(EnteroGrande, primary_key=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    incidencia_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("incidencias.id"))
    accion: Mapped[str] = mapped_column(String(255))
    entidad: Mapped[str] = mapped_column(String(255))
    entidad_id: Mapped[str | None] = mapped_column(String(255))
    valores_anteriores: Mapped[dict | None] = mapped_column(JsonCompatible)
    valores_nuevos: Mapped[dict | None] = mapped_column(JsonCompatible)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)


class SesionRenovacion(Base):
    __tablename__ = "sesiones_renovacion"
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    vence_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revocada_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
