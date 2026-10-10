import re
from html import unescape
from urllib.parse import parse_qs, urlparse

from sqlalchemy import select

from app.configuracion.ajustes import ajustes
from app.modelos.dominio import Usuario
from tests.conftest import csrf, login


def test_verificacion_y_recuperacion_ciudadana(entorno, monkeypatch):
    cliente, fabrica, _ = entorno
    envios = []

    class Respuesta:
        def raise_for_status(self):
            pass

    def enviar(_url, **opciones):
        envios.append(opciones["json"])
        return Respuesta()

    monkeypatch.setenv("RESEND_API_KEY", "clave-de-pruebas")
    ajustes.cache_clear()
    monkeypatch.setattr("app.servicios.correo.httpx.post", enviar)
    cabeceras = csrf(cliente)
    registro = cliente.post("/registro", headers=cabeceras, json={
        "nombre": "Ana", "email": "ana@gmail.com", "password": "Clave1234!",
        "password_confirmation": "Clave1234!",
    })
    assert registro.status_code == 201
    assert registro.json()["correo_verificacion_enviado"] is True
    assert envios[0]["to"] == ["ana@gmail.com"]

    mensaje = cliente.post("/clave/recuperacion/solicitar", headers=cabeceras,
                           json={"email": "ana@gmail.com"})
    assert mensaje.status_code == 200
    assert len(envios) == 1  # Aún no se verificó el correo.

    enlace = unescape(re.search(r'href="([^"]+)"', envios[0]["html"]).group(1))
    token = parse_qs(urlparse(enlace).query)["token"][0]
    assert cliente.post("/correo/verificar", headers=cabeceras, json={"token": token}).status_code == 200
    assert cliente.post("/correo/verificar", headers=cabeceras, json={"token": token}).status_code == 422
    with fabrica() as db:
        assert db.scalar(select(Usuario).where(Usuario.email == "ana@gmail.com")).email_verified_at

    solicitud = cliente.post("/clave/recuperacion/solicitar", headers=cabeceras,
                            json={"email": "ana@gmail.com"})
    assert solicitud.status_code == 200
    assert len(envios) == 2
    enlace = unescape(re.search(r'href="([^"]+)"', envios[1]["html"]).group(1))
    token = parse_qs(urlparse(enlace).query)["token"][0]
    nueva = {"token": token, "password": "NuevaClave123!", "password_confirmation": "NuevaClave123!"}
    assert cliente.post("/clave/recuperacion/confirmar", headers=cabeceras, json=nueva).status_code == 200
    assert cliente.post("/clave/recuperacion/confirmar", headers=cabeceras, json=nueva).status_code == 422
    assert cliente.post("/login", headers=cabeceras,
                        json={"email": "ana@gmail.com", "password": "NuevaClave123!"}).status_code == 200


def test_permisos_de_cambio_de_clave(entorno):
    cliente, _, _ = entorno
    cabeceras = login(cliente, "tecnico@urbancloudai.com")
    cambio = {"current_password": "Clave1234!", "password": "OtraClave123!",
              "password_confirmation": "OtraClave123!"}
    assert cliente.post("/cuenta/cambiar-clave", headers=cabeceras, json=cambio).status_code == 403
    cliente.post("/logout", headers=cabeceras)

    cabeceras = login(cliente, "admin@urbancloudai.com")
    assert cliente.patch("/administracion/usuarios/4/clave", headers=cabeceras,
                         json={"password": "Temporal123!",
                               "password_confirmation": "Temporal123!"}).status_code == 200
    assert cliente.post("/cuenta/cambiar-clave", headers=cabeceras, json=cambio).status_code == 200
    assert cliente.get("/dashboard").status_code == 401
