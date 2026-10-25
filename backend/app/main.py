from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.security import APIKeyHeader
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import (administracion, autenticacion, catalogos, ciudadano,
                     evidencias, notificaciones, operacion, panel, supervision, tecnico)
from app.configuracion.ajustes import ajustes
from app.seguridad.sesiones import csrf_valido, token_csrf

config = ajustes()
# La cabecera X-CSRF-TOKEN se declara como esquema de seguridad para que Swagger pueda enviarla (botón Authorize).
app = FastAPI(title="UrbanCloud AI", version="1.0.0",
              dependencies=[Depends(APIKeyHeader(name="X-CSRF-TOKEN", auto_error=False))],
              docs_url="/docs" if config.docs_visibles else None,
              redoc_url="/redoc" if config.docs_visibles else None,
              openapi_url="/openapi.json" if config.docs_visibles else None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origen.strip() for origen in config.frontend_origin.split(",") if origen.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "X-CSRF-TOKEN"],
)


@app.middleware("http")
async def proteger_mutaciones(request: Request, siguiente):
    if request.method in {"POST", "PATCH", "PUT", "DELETE"} and not csrf_valido(
        request.cookies.get("uc_csrf"), request.headers.get("X-CSRF-TOKEN")
    ):
        return JSONResponse(status_code=419, content={"mensaje": "Solicitud no válida. Actualiza la página."})
    return await siguiente(request)


@app.exception_handler(HTTPException)
async def error_http(_request: Request, error: HTTPException):
    return JSONResponse(status_code=error.status_code, content={"mensaje": str(error.detail)})


@app.exception_handler(RequestValidationError)
async def error_validacion(_request: Request, error: RequestValidationError):
    errores = {}
    for item in error.errors():
        campo = ".".join(str(parte) for parte in item["loc"] if parte not in {"body", "query"})
        errores.setdefault(campo or "datos", []).append(item["msg"])
    return JSONResponse(status_code=422, content={"mensaje": "Revisa los datos ingresados.", "errors": errores})


@app.get("/")
def inicio():
    return {"aplicacion": "UrbanCloud AI", "servicio": "API de incidencias urbanas"}


@app.get("/health")
def health():
    return {"estado": "ok"}


@app.get("/sesion/csrf")
def csrf(respuesta: Response):
    token = token_csrf()
    respuesta.set_cookie("uc_csrf", token, max_age=7 * 24 * 3600, httponly=True,
                         secure=config.secure_cookies, samesite=config.cookie_samesite, path="/")
    return {"token": token}


app.include_router(autenticacion.router)
app.include_router(catalogos.router)
app.include_router(panel.router)
app.include_router(notificaciones.router)
app.include_router(evidencias.router)
app.include_router(ciudadano.router)
app.include_router(operacion.router)
app.include_router(supervision.router)
app.include_router(tecnico.router)
app.include_router(administracion.router)
