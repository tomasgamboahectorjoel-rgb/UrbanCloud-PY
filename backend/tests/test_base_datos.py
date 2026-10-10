"""Configuracion del motor de base de datos."""

from app.configuracion import base
from app.configuracion.ajustes import Ajustes
from app.configuracion.base import argumentos_conexion, opciones_motor


def test_sqlite_conserva_el_argumento_de_hilos():
    assert argumentos_conexion("sqlite:///:memory:") == {"check_same_thread": False}


def test_postgresql_desactiva_las_sentencias_preparadas():
    # Con el pooler transaccional de Supabase, las sentencias preparadas del servidor chocan entre clientes.
    url = "postgresql+psycopg://usuario:clave@host:6543/postgres?sslmode=require"
    assert argumentos_conexion(url) == {"prepare_threshold": None}


def test_el_motor_de_postgresql_se_crea_con_ese_argumento(monkeypatch):
    llamadas = []

    class AjustesFalsos(Ajustes):
        database_url: str = "postgresql+psycopg://usuario:clave@host:6543/postgres"

    monkeypatch.setattr(base, "ajustes", lambda: AjustesFalsos())
    monkeypatch.setattr(base, "create_engine", lambda url, **kwargs: llamadas.append((url, kwargs)) or object())
    base.motor.cache_clear()
    try:
        base.motor()
    finally:
        base.motor.cache_clear()

    assert len(llamadas) == 1
    url, kwargs = llamadas[0]
    assert url == AjustesFalsos().database_url
    assert kwargs["connect_args"] == {"prepare_threshold": None}
    assert kwargs["pool_pre_ping"] is True


def test_el_grupo_de_conexiones_conserva_los_valores_de_sqlalchemy_por_defecto():
    config = Ajustes()
    assert (config.db_pool_size, config.db_max_overflow, config.db_pool_timeout) == (5, 10, 30)
    opciones = opciones_motor("postgresql+psycopg://u:p@h:6543/db", config)
    assert (opciones["pool_size"], opciones["max_overflow"], opciones["pool_timeout"]) == (5, 10, 30)


def test_el_grupo_de_conexiones_se_puede_ampliar():
    config = Ajustes(db_pool_size=20, db_max_overflow=20, db_pool_timeout=15)
    opciones = opciones_motor("postgresql+psycopg://u:p@h:6543/db", config)
    assert (opciones["pool_size"], opciones["max_overflow"], opciones["pool_timeout"]) == (20, 20, 15)
    assert opciones["connect_args"] == {"prepare_threshold": None}
    assert opciones["pool_pre_ping"] is True


def test_sqlite_no_recibe_opciones_de_grupo():
    opciones = opciones_motor("sqlite:///:memory:", Ajustes())
    assert "pool_size" not in opciones and "max_overflow" not in opciones and "pool_timeout" not in opciones
    assert opciones["connect_args"] == {"check_same_thread": False}


def test_valores_fuera_de_rango_se_rechazan():
    import pytest
    from pydantic import ValidationError
    for campo, valor in (("db_pool_size", 0), ("db_pool_size", 500), ("db_max_overflow", -1), ("db_pool_timeout", 0)):
        with pytest.raises(ValidationError):
            Ajustes(**{campo: valor})
