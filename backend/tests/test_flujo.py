import io
from datetime import timedelta

from PIL import Image
from sqlalchemy import func, select

from app.modelos.dominio import (
    Auditoria, EvidenciaIncidencia, Incidencia, Notificacion, Usuario, ValidacionReporte, ahora,
)
from app.servicios.ia import ErrorIntegracionIA
from tests.conftest import csrf, login


def imagen_jpg():
    salida = io.BytesIO()
    Image.new("RGB", (20, 20), "blue").save(salida, format="JPEG")
    return salida.getvalue()


def registrar_ciudadano(cliente, nombre="ana"):
    cabeceras = csrf(cliente)
    respuesta = cliente.post("/registro", headers=cabeceras,
                             json={"nombre": nombre.title(), "email": f"{nombre}@urbancloudai.com",
                                   "password": "Clave1234!", "password_confirmation": "Clave1234!"})
    assert respuesta.status_code == 201, respuesta.text


def test_similares_encuentra_un_reporte_antiguo_con_plural(entorno):
    cliente, fabrica, _ = entorno
    registrar_ciudadano(cliente)
    login(cliente, "ana@urbancloudai.com")
    with fabrica() as db:
        ciudadano = db.scalar(select(Usuario).where(Usuario.email == "ana@urbancloudai.com"))
        base = dict(ciudadano_id=ciudadano.id, descripcion="Descripción del reporte.",
                    estado_id=1, distrito_id=1, direccion="Av. Principal")
        db.add(Incidencia(**base, codigo="ANTIGUO", titulo="Bache profundo",
                          latitud=-9.0747, longitud=-78.5934,
                          created_at=ahora() - timedelta(days=365)))
        db.add_all(Incidencia(**base, codigo=f"LEJANO-{numero}", titulo="Baches en otra zona",
                              latitud=-9.5, longitud=-78.9)
                   for numero in range(105))
        db.commit()
    respuesta = cliente.get("/incidencias/similares", params={
        "titulo": "Baches grandes", "distrito_id": 1,
        "latitud": -9.0747, "longitud": -78.5934,
    })
    assert respuesta.status_code == 200
    assert [item["codigo"] for item in respuesta.json()["datos"]] == ["ANTIGUO"]


def crear_incidente(cliente, cabeceras):
    return cliente.post("/incidencias", headers=cabeceras,
                        data={"titulo": "Poste apagado", "descripcion": "El poste no enciende desde anoche.",
                              "distrito_id": "1", "direccion": "Av. Principal", "latitud": "-9.08",
                              "longitud": "-78.57"},
                        files={"fotografia": ("poste.jpg", imagen_jpg(), "image/jpeg")})


def respuesta_ia_valida(*_):
    return {"valido": True, "categoria": "Iluminación", "prioridad": "Media",
            "areaResponsable": "Alumbrado público", "confianza": 0.92}


def test_ia_rechazada_y_error_no_crean_incidencia(entorno, monkeypatch):
    cliente, fabrica, raiz = entorno
    registrar_ciudadano(cliente)
    cabeceras = login(cliente, "ana@urbancloudai.com")
    monkeypatch.setattr("app.servicios.incidencias.analizar",
                        lambda *_: {"valido": False, "motivo": "La imagen no evidencia una incidencia."})
    rechazo = crear_incidente(cliente, cabeceras)
    assert rechazo.status_code == 422, rechazo.text
    assert rechazo.json()["aceptado"] is False
    with fabrica() as db:
        assert db.scalar(select(func.count(Incidencia.id))) == 0
        assert db.scalar(select(func.count(EvidenciaIncidencia.id))) == 0
        assert db.scalar(select(func.count(ValidacionReporte.id))) == 1

    def fallar(*_):
        raise ErrorIntegracionIA

    monkeypatch.setattr("app.servicios.incidencias.analizar", fallar)
    error = crear_incidente(cliente, cabeceras)
    assert error.status_code == 503
    with fabrica() as db:
        assert db.scalar(select(func.count(Incidencia.id))) == 0
    assert len(list((raiz / "archivos" / "reportes").rglob("*.jpg"))) == 1


def test_flujo_por_roles_evidencia_privada_y_revision(entorno, monkeypatch):
    cliente, fabrica, _ = entorno
    registrar_ciudadano(cliente)
    registrar_ciudadano(cliente, "beto")
    monkeypatch.setattr("app.servicios.incidencias.analizar", respuesta_ia_valida)

    cabeceras = login(cliente, "ana@urbancloudai.com")
    creado = crear_incidente(cliente, cabeceras)
    assert creado.status_code == 201, creado.text
    identificador = creado.json()["id"]
    assert creado.json()["codigo"].startswith("URB-")
    assert cliente.get(f"/incidencias/{identificador}").status_code == 200
    evidencia = cliente.get(f"/incidencias/{identificador}").json()["evidencias"][0]["id"]
    assert cliente.get(f"/incidencias/{identificador}/evidencias/{evidencia}/ver").status_code == 200
    assert cliente.post(f"/incidencias/{identificador}/solicitar-revision", headers=cabeceras,
                        json={"motivo": "Necesita nueva revisión del cierre."}).status_code == 422
    cliente.post("/logout", headers=cabeceras)

    cabeceras = login(cliente, "beto@urbancloudai.com")
    assert cliente.get(f"/incidencias/{identificador}").status_code == 403
    assert cliente.get(f"/incidencias/{identificador}/evidencias/{evidencia}/ver").status_code == 403
    seguido = cliente.post(f"/incidencias/{identificador}/seguir", headers=cabeceras)
    assert seguido.status_code == 201
    assert cliente.get(f"/incidencias/seguidas/{identificador}").status_code == 200
    cliente.post("/logout", headers=cabeceras)

    cabeceras = login(cliente, "operador@urbancloudai.com")
    revision = cliente.post(f"/operacion/incidencias/{identificador}/revisar", headers=cabeceras,
                            json={"categoria_id": 1, "prioridad_id": 1, "area_id": 1})
    assert revision.status_code == 200, revision.text
    assert revision.json()["estado"] == "Derivado"
    cliente.post("/logout", headers=cabeceras)

    cabeceras = login(cliente, "supervisor@urbancloudai.com")
    assert cliente.post(f"/supervision/incidencias/{identificador}/cerrar", headers=cabeceras,
                        json={}).status_code == 422
    asignado = cliente.post(f"/supervision/incidencias/{identificador}/asignar", headers=cabeceras,
                            json={"tecnico_id": 4})
    assert asignado.status_code == 200, asignado.text
    cliente.post("/logout", headers=cabeceras)

    cabeceras = login(cliente, "tecnico@urbancloudai.com")
    atendido_antes = cliente.post(f"/tecnico/tareas/{identificador}/actualizar", headers=cabeceras,
                                  data={"accion": "atendido", "comentario": "El poste ya fue reparado."})
    assert atendido_antes.status_code == 422
    iniciado = cliente.post(f"/tecnico/tareas/{identificador}/actualizar", headers=cabeceras,
                           data={"accion": "iniciar", "comentario": "Iniciando revisión del poste."})
    assert iniciado.status_code == 200, iniciado.text
    atendido = cliente.post(f"/tecnico/tareas/{identificador}/actualizar", headers=cabeceras,
                           data={"accion": "atendido", "comentario": "El poste ha sido reparado."})
    assert atendido.status_code == 200, atendido.text
    assert atendido.json()["estado"] == "Atendido"
    cliente.post("/logout", headers=cabeceras)

    cabeceras = login(cliente, "supervisor@urbancloudai.com")
    cerrado = cliente.post(f"/supervision/incidencias/{identificador}/cerrar", headers=cabeceras, json={})
    assert cerrado.status_code == 200, cerrado.text
    cliente.post("/logout", headers=cabeceras)

    cabeceras = login(cliente, "tecnico@urbancloudai.com")
    historial = cliente.get("/tecnico/historial")
    assert historial.status_code == 200, historial.text
    assert historial.json()["total"] == 1
    assert historial.json()["data"][0]["codigo"] == creado.json()["codigo"]
    cliente.post("/logout", headers=cabeceras)

    cabeceras = login(cliente, "ana@urbancloudai.com")
    revision = cliente.post(f"/incidencias/{identificador}/solicitar-revision", headers=cabeceras,
                            json={"motivo": "El poste volvió a apagarse después del cierre."})
    assert revision.status_code == 200, revision.text
    cliente.post("/logout", headers=cabeceras)

    cabeceras = login(cliente, "operador@urbancloudai.com")
    resuelta = cliente.post(f"/operacion/incidencias/{identificador}/resolver-revision", headers=cabeceras,
                            json={"decision": "reabrir", "motivo": "Se confirmó la falla nuevamente."})
    assert resuelta.status_code == 200, resuelta.text
    assert resuelta.json()["estado"] == "En revisión"
    with fabrica() as db:
        assert db.scalar(select(func.count(Auditoria.id))) >= 3
        assert db.scalar(select(func.count(Notificacion.id))) >= 3
