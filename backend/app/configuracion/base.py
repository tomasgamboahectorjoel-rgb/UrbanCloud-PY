"""Conexión y sesiones SQLAlchemy. Nunca crea tablas en PostgreSQL al importar."""

from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.configuracion.ajustes import ajustes


class Base(DeclarativeBase):
    pass


def argumentos_conexion(url: str) -> dict:
    """Argumentos del conector segun la base de datos.

    En PostgreSQL se desactivan las sentencias preparadas del servidor (prepare_threshold=None):
    el pooler transaccional de Supabase multiplexa clientes sobre las mismas conexiones reales y,
    con ellas activas, falla con DuplicatePreparedStatement / InvalidSqlStatementName.
    """
    if url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {"prepare_threshold": None}


@lru_cache
def motor():
    url = ajustes().database_url
    return create_engine(url, pool_pre_ping=True, connect_args=argumentos_conexion(url))


def sesion_bd():
    fabrica = sessionmaker(bind=motor(), autoflush=False, expire_on_commit=False)
    with fabrica() as sesion:
        yield sesion


def guardar(sesion: Session) -> None:
    sesion.commit()
