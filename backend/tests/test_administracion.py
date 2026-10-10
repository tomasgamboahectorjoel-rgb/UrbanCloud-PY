from sqlalchemy import select

from app.modelos.dominio import Auditoria, Notificacion, Usuario
from tests.conftest import login


def test_administracion_usuarios_configuracion_y_auditoria(entorno):
    cliente, fabrica, _ = entorno
    cabeceras = login(cliente, "admin@urbancloudai.com")
    datos = {"nombre": "Nuevo técnico", "email": "nuevo@urbancloudai.com",
             "password": "Clave1234!", "password_confirmation": "Clave1234!",
             "rol_id": 4, "area_id": 1}
    creado = cliente.post("/administracion/usuarios", headers=cabeceras, json=datos)
    assert creado.status_code == 201, creado.text
    assert creado.json()["usuario"]["rol"] == "Personal técnico"
    assert cliente.post("/administracion/usuarios", headers=cabeceras,
                        json={**datos, "email": "nuevo@gmail.com"}).status_code == 201
    assert cliente.post("/administracion/usuarios", headers=cabeceras,
                        json={**datos, "email": "nuevo@ga"}).status_code == 422
    assert cliente.post("/administracion/usuarios", headers=cabeceras, json=datos).status_code == 422
    assert cliente.patch("/administracion/usuarios/1/estado", headers=cabeceras,
                         json={"activo": False}).status_code == 422
    id_nuevo = creado.json()["usuario"]["id"]
    desactivado = cliente.patch(f"/administracion/usuarios/{id_nuevo}/estado", headers=cabeceras,
                                json={"activo": False})
    assert desactivado.status_code == 200
    assert desactivado.json()["usuario"]["activo"] is False
    assert cliente.get("/administracion/usuarios?activo=false").json()["total"] == 1

    guardado = cliente.patch("/administracion/configuracion", headers=cabeceras,
                             json={"umbral_confianza_ia": 74, "alertas_duplicados_activas": False})
    assert guardado.status_code == 200, guardado.text
    assert cliente.get("/panel/resumen").json()["umbral_ia"] == "74"
    assert cliente.get("/administracion/auditoria").json()["total"] == 1
    with fabrica() as db:
        auditoria = db.scalar(select(Auditoria))
        assert auditoria.valores_nuevos["umbral_confianza_ia"] == 74


def test_notificaciones_aisladas(entorno):
    cliente, fabrica, _ = entorno
    with fabrica() as db:
        admin = db.scalar(select(Usuario).where(Usuario.email == "admin@urbancloudai.com"))
        operador = db.scalar(select(Usuario).where(Usuario.email == "operador@urbancloudai.com"))
        propia = Notificacion(usuario_id=admin.id, titulo="Aviso admin", mensaje="Solo admin")
        ajena = Notificacion(usuario_id=operador.id, titulo="Aviso operador", mensaje="Solo operador")
        db.add_all([propia, ajena])
        db.commit()
        propia_id, ajena_id = propia.id, ajena.id

    cabeceras = login(cliente, "admin@urbancloudai.com")
    lista = cliente.get("/notificaciones").json()
    assert lista["no_leidas"] == 1
    assert lista["notificaciones"]["total"] == 1
    assert cliente.patch(f"/notificaciones/{ajena_id}/leer", headers=cabeceras).status_code == 403
    assert cliente.patch(f"/notificaciones/{propia_id}/leer", headers=cabeceras).status_code == 200
    assert cliente.get("/notificaciones").json()["no_leidas"] == 0
