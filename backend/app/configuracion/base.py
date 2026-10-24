"""Conexión y sesiones SQLAlchemy. Nunca crea tablas en PostgreSQL al importar."""

from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.configuracion.ajustes import ajustes


class Base(DeclarativeBase):
    pass


def argumentos_conexion(url: str) -> dict:
    """Devuelve los argumentos del conector según la base de datos.

    En PostgreSQL se desactivan las sentencias preparadas del servidor (prepare_threshold=None):
    el pooler transaccional de Supabase multiplexa clientes sobre las mismas conexiones reales y,
    con ellas activas, falla con DuplicatePreparedStatement / InvalidSqlStatementName.
    """
    if url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {"prepare_threshold": None}


def opciones_motor(url: str, config) -> dict:
    """Devuelve las opciones de create_engine; el grupo de conexiones solo aplica a PostgreSQL."""
    opciones = {"pool_pre_ping": True, "connect_args": argumentos_conexion(url)}
    if not url.startswith("sqlite"):
        opciones.update(pool_size=config.db_pool_size, max_overflow=config.db_max_overflow,
                        pool_timeout=config.db_pool_timeout)
    return opciones


@lru_cache
def motor():
    config = ajustes()
    return create_engine(config.database_url, **opciones_motor(config.database_url, config))


def sesion_bd():
    fabrica = sessionmaker(bind=motor(), autoflush=False, expire_on_commit=False)
    with fabrica() as sesion:
        yield sesion


def guardar(sesion: Session) -> None:
    sesion.commit()
