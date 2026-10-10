"""Configuracion del motor de base de datos."""

from app.configuracion import base
from app.configuracion.base import argumentos_conexion


def test_sqlite_conserva_el_argumento_de_hilos():
    assert argumentos_conexion("sqlite:///:memory:") == {"check_same_thread": False}


def test_postgresql_desactiva_las_sentencias_preparadas():
    # Con el pooler transaccional de Supabase, las sentencias preparadas del servidor chocan entre clientes.
    url = "postgresql+psycopg://usuario:clave@host:6543/postgres?sslmode=require"
    assert argumentos_conexion(url) == {"prepare_threshold": None}


def test_el_motor_de_postgresql_se_crea_con_ese_argumento(monkeypatch):
    llamadas = []

    class Ajustes:
        database_url = "postgresql+psycopg://usuario:clave@host:6543/postgres"

    monkeypatch.setattr(base, "ajustes", lambda: Ajustes())
    monkeypatch.setattr(base, "create_engine", lambda url, **kwargs: llamadas.append((url, kwargs)) or object())
    base.motor.cache_clear()
    try:
        base.motor()
    finally:
        base.motor.cache_clear()

    assert len(llamadas) == 1
    url, kwargs = llamadas[0]
    assert url == Ajustes.database_url
    assert kwargs["connect_args"] == {"prepare_threshold": None}
    assert kwargs["pool_pre_ping"] is True
