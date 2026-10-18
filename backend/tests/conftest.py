import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.configuracion.ajustes import ajustes
from app.configuracion.base import Base, sesion_bd
from app.main import app
from app.modelos.dominio import (
    Area, Categoria, ConfiguracionSistema, Distrito, EstadoIncidencia, Prioridad, Rol, Usuario,
)
from app.seguridad.sesiones import hash_clave


@pytest.fixture
def entorno(tmp_path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'pruebas.sqlite').as_posix()}"
    motor = create_engine(url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(motor)  # Esto solo afecta a la base SQLite temporal de esta prueba.
    fabrica = sessionmaker(motor, expire_on_commit=False)
    with fabrica() as db:
        db.add_all([Rol(nombre=nombre) for nombre in
                    ["Ciudadano", "Operador", "Supervisor", "Personal técnico", "Administrador"]])
        db.add_all([EstadoIncidencia(nombre=nombre) for nombre in
                    ["En revisión", "Derivado", "Asignado", "En atención", "Atendido",
                     "Cerrado", "Revisión solicitada", "Impedido"]])
        db.add_all([Area(nombre="Alumbrado público"), Categoria(nombre="Iluminación"),
                    Prioridad(nombre="Media", nivel=2),
                    Distrito(nombre="Chimbote", provincia="Santa", departamento="Áncash"),
                    ConfiguracionSistema(clave="UMBRAL_CONFIANZA_IA", valor="70"),
                    ConfiguracionSistema(clave="ALERTAS_DUPLICADOS_ACTIVAS", valor="true")])
        db.commit()
        roles = {rol.nombre: rol.id for rol in db.query(Rol)}
        area = db.query(Area).first()
        db.add_all([
            Usuario(nombre="Admin", email="admin@urbancloudai.com", password=hash_clave("Clave1234!"),
                    rol_id=roles["Administrador"], activo=True),
            Usuario(nombre="Operador", email="operador@urbancloudai.com", password=hash_clave("Clave1234!"),
                    rol_id=roles["Operador"], activo=True),
            Usuario(nombre="Supervisor", email="supervisor@urbancloudai.com", password=hash_clave("Clave1234!"),
                    rol_id=roles["Supervisor"], activo=True),
            Usuario(nombre="Técnico", email="tecnico@urbancloudai.com", password=hash_clave("Clave1234!"),
                    rol_id=roles["Personal técnico"], area_id=area.id, activo=True),
        ])
        db.commit()

    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("STORAGE_ROOT", str(tmp_path / "archivos"))
    monkeypatch.setenv("SECRET_KEY", "clave-aislada-de-pruebas-con-longitud-suficiente")
    ajustes.cache_clear()

    def db_prueba():
        with fabrica() as sesion:
            yield sesion

    app.dependency_overrides[sesion_bd] = db_prueba
    with TestClient(app) as cliente:
        yield cliente, fabrica, tmp_path
    app.dependency_overrides.clear()
    ajustes.cache_clear()
    motor.dispose()


def csrf(cliente):
    token = cliente.get("/sesion/csrf").json()["token"]
    return {"X-CSRF-TOKEN": token}


def login(cliente, correo):
    cabeceras = csrf(cliente)
    respuesta = cliente.post("/login", headers=cabeceras,
                             json={"email": correo, "password": "Clave1234!"})
    assert respuesta.status_code == 200, respuesta.text
    return cabeceras
