"""Cookies de acceso/renovación, protección CSRF y permisos por rol."""

import hashlib
import hmac
import secrets
import uuid
from datetime import timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.configuracion.ajustes import ajustes
from app.configuracion.base import sesion_bd
from app.modelos.dominio import Rol, SesionRenovacion, Usuario, ahora


def hash_clave(clave: str) -> str:
    return bcrypt.hashpw(clave.encode(), bcrypt.gensalt(rounds=12)).decode()


def verificar_clave(clave: str, hash_guardado: str) -> bool:
    try:
        valor = hash_guardado.replace("$2y$", "$2b$", 1)
        return bcrypt.checkpw(clave.encode(), valor.encode())
    except (ValueError, TypeError):
        return False


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _vencida(fecha) -> bool:
    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=timezone.utc)
    return fecha < ahora()


def _cookie(respuesta: Response, nombre: str, valor: str, duracion: int) -> None:
    config = ajustes()
    respuesta.set_cookie(nombre, valor, max_age=duracion, httponly=True,
                         secure=config.secure_cookies, samesite=config.cookie_samesite,
                         path="/")


def _access(usuario_id: int, sesion_id: uuid.UUID) -> str:
    return jwt.encode({"sub": str(usuario_id), "sid": str(sesion_id), "typ": "access",
                       "exp": ahora() + timedelta(minutes=15)},
                      ajustes().secret_key, algorithm="HS256")


def iniciar_sesion(respuesta: Response, db: Session, usuario: Usuario) -> None:
    token = secrets.token_urlsafe(48)
    sesion = SesionRenovacion(usuario_id=usuario.id, token_hash=_hash_token(token),
                              vence_en=ahora() + timedelta(days=7))
    db.add(sesion)
    db.flush()
    _cookie(respuesta, "uc_access", _access(usuario.id, sesion.id), 15 * 60)
    _cookie(respuesta, "uc_refresh", f"{sesion.id}.{token}", 7 * 24 * 3600)


def renovar_sesion(respuesta: Response, db: Session, cookie: str | None) -> None:
    try:
        id_texto, token = (cookie or "").split(".", 1)
        sesion = db.get(SesionRenovacion, uuid.UUID(id_texto))
    except (ValueError, AttributeError):
        sesion = None
    if sesion is None or sesion.revocada_en or _vencida(sesion.vence_en) \
            or not hmac.compare_digest(sesion.token_hash, _hash_token(token)):
        raise HTTPException(401, "Tu sesión terminó. Inicia sesión nuevamente.")
    usuario = db.get(Usuario, sesion.usuario_id)
    if usuario is None or not usuario.activo:
        sesion.revocada_en = ahora()
        db.commit()
        raise HTTPException(401, "Tu sesión terminó. Inicia sesión nuevamente.")
    nuevo = secrets.token_urlsafe(48)
    sesion.token_hash = _hash_token(nuevo)
    db.commit()
    _cookie(respuesta, "uc_access", _access(usuario.id, sesion.id), 15 * 60)
    _cookie(respuesta, "uc_refresh", f"{sesion.id}.{nuevo}", 7 * 24 * 3600)


def cerrar_sesion(respuesta: Response, db: Session, cookie: str | None) -> None:
    try:
        id_texto = (cookie or "").split(".", 1)[0]
        sesion = db.get(SesionRenovacion, uuid.UUID(id_texto))
    except (ValueError, AttributeError):
        sesion = None
    if sesion:
        sesion.revocada_en = ahora()
        db.commit()
    for nombre in ("uc_access", "uc_refresh"):
        respuesta.delete_cookie(nombre, path="/", samesite=ajustes().cookie_samesite,
                                secure=ajustes().secure_cookies, httponly=True)


def usuario_actual(request: Request, db: Session = Depends(sesion_bd)) -> Usuario:
    try:
        datos = jwt.decode(request.cookies.get("uc_access", ""), ajustes().secret_key,
                           algorithms=["HS256"], options={"require": ["sub", "sid", "exp"]})
        if datos.get("typ") != "access":
            raise ValueError("tipo")
        sesion = db.get(SesionRenovacion, uuid.UUID(datos["sid"]))
        usuario = db.get(Usuario, int(datos["sub"]))
    except (jwt.PyJWTError, ValueError, TypeError, KeyError):
        sesion = usuario = None
    if sesion is None or sesion.revocada_en or _vencida(sesion.vence_en) \
            or usuario is None or not usuario.activo or sesion.usuario_id != usuario.id:
        raise HTTPException(401, "Tu sesión terminó. Inicia sesión nuevamente.")
    return usuario


def rol_usuario(db: Session, usuario: Usuario) -> str:
    rol = db.get(Rol, usuario.rol_id)
    return rol.nombre if rol else ""


def exigir_rol(*permitidos: str):
    def verificar(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(sesion_bd)) -> Usuario:
        if rol_usuario(db, usuario) not in permitidos:
            raise HTTPException(403, "No tienes permiso para realizar esta acción.")
        return usuario
    return verificar


def token_csrf() -> str:
    nonce = secrets.token_urlsafe(24)
    firma = hmac.new(ajustes().secret_key.encode(), nonce.encode(), hashlib.sha256).hexdigest()
    return f"{nonce}.{firma}"


def csrf_valido(cookie: str | None, cabecera: str | None) -> bool:
    if not cookie or not cabecera or not hmac.compare_digest(cookie, cabecera):
        return False
    try:
        nonce, firma = cookie.split(".", 1)
    except ValueError:
        return False
    esperada = hmac.new(ajustes().secret_key.encode(), nonce.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(firma, esperada)


def resumen_usuario(db: Session, usuario: Usuario) -> dict:
    return {"id": usuario.id, "nombre": usuario.nombre, "correo": usuario.email,
            "rol": rol_usuario(db, usuario), "correo_verificado": bool(usuario.email_verified_at)}
