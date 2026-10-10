from sqlalchemy import select

from app.modelos.dominio import Usuario
from tests.conftest import csrf, login


def test_registro_login_renovacion_logout_y_rol(entorno):
    cliente, fabrica, _ = entorno
    cabeceras = csrf(cliente)
    datos = {"nombre": "Ana", "email": "ana@urbancloudai.com",
             "password": "Clave1234!", "password_confirmation": "Clave1234!"}
    creado = cliente.post("/registro", headers=cabeceras, json=datos)
    assert creado.status_code == 201, creado.text
    assert creado.json()["usuario"]["rol"] == "Ciudadano"
    duplicado = cliente.post("/registro", headers=cabeceras, json=datos)
    assert duplicado.status_code == 422
    assert "registrado" in duplicado.json()["mensaje"]
    assert cliente.post("/registro", headers=cabeceras,
                        json={**datos, "email": "ana@gmail.com"}).status_code == 201
    for correo_malo in ("hector@a", "hector@ga", "hector@g", "hector..perez@gmail.com"):
        assert cliente.post("/registro", headers=cabeceras,
                            json={**datos, "email": correo_malo}).status_code == 422

    cabeceras = login(cliente, "ana@urbancloudai.com")
    assert cliente.get("/dashboard").json()["destino"] == "/ciudadano"
    assert cliente.post("/registro", headers=cabeceras, json={**datos, "email": "otra@urbancloudai.com"}).status_code == 409
    assert cliente.post("/login", headers=cabeceras,
                        json={"email": "ana@urbancloudai.com", "password": "Clave1234!"}).status_code == 409
    assert cliente.get("/administracion/usuarios").status_code == 403
    cliente.cookies.delete("uc_access")
    assert cliente.post("/auth/refresh", headers=cabeceras).status_code == 200
    assert cliente.get("/dashboard").status_code == 200
    assert cliente.post("/logout", headers=cabeceras).status_code == 200
    assert cliente.get("/dashboard").status_code == 401
    assert cliente.post("/auth/refresh", headers=cabeceras).status_code == 401


def test_inactivo_y_csrf(entorno):
    cliente, fabrica, _ = entorno
    with fabrica() as db:
        usuario = db.scalar(select(Usuario).where(Usuario.email == "operador@urbancloudai.com"))
        usuario.activo = False
        db.commit()
    cabeceras = csrf(cliente)
    assert cliente.post("/login", headers=cabeceras,
                        json={"email": "operador@urbancloudai.com", "password": "Clave1234!"}).status_code == 422
    assert cliente.post("/login", json={"email": "admin@urbancloudai.com",
                                        "password": "Clave1234!"}).status_code == 419
