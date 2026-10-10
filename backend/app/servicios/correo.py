"""Envío transaccional y tokens de un solo uso."""

import hashlib
import logging
import secrets
from datetime import timedelta, timezone
from html import escape
from urllib.parse import quote

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.configuracion.ajustes import ajustes
from app.modelos.dominio import TokenCorreo, Usuario, ahora

log = logging.getLogger(__name__)


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def emitir(db: Session, usuario: Usuario, proposito: str) -> bool:
    """Crea un token y envía el enlace; no anuncia éxito si el proveedor falla."""
    if not ajustes().resend_api_key:
        return False
    ultimo = db.scalar(select(TokenCorreo).where(
        TokenCorreo.usuario_id == usuario.id,
        TokenCorreo.proposito == proposito,
        TokenCorreo.usado_en.is_(None),
    ).order_by(TokenCorreo.created_at.desc()))
    if ultimo and _vigente(ultimo.vence_en) and ultimo.created_at:
        fecha = ultimo.created_at.replace(tzinfo=timezone.utc) if ultimo.created_at.tzinfo is None else ultimo.created_at
        if fecha > ahora() - timedelta(seconds=60):
            return True

    token = secrets.token_urlsafe(48)
    duracion = timedelta(hours=24) if proposito == "verificar" else timedelta(minutes=30)
    registro = TokenCorreo(usuario_id=usuario.id, proposito=proposito,
                           token_hash=_hash(token), vence_en=ahora() + duracion)
    db.add(registro)
    db.commit()
    ruta = "verificar-correo" if proposito == "verificar" else "restablecer-clave"
    enlace = f"{ajustes().public_frontend_url.rstrip('/')}/{ruta}?token={quote(token)}"
    asunto = "Verifica tu correo de UrbanCloud AI" if proposito == "verificar" else "Recupera tu contraseña de UrbanCloud AI"
    accion = "Verificar correo" if proposito == "verificar" else "Restablecer contraseña"
    html = (f"<p>Hola, {escape(usuario.nombre)}.</p>"
            f"<p>Usa este enlace para {accion.lower()}. Caduca en "
            f"{'24 horas' if proposito == 'verificar' else '30 minutos'}.</p>"
            f"<p><a href=\"{escape(enlace, quote=True)}\">{accion}</a></p>"
            "<p>Si no solicitaste esto, ignora este mensaje.</p>")
    try:
        respuesta = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {ajustes().resend_api_key}"},
            json={"from": ajustes().email_from, "to": [usuario.email],
                  "subject": asunto, "html": html}, timeout=10,
        )
        respuesta.raise_for_status()
        return True
    except httpx.HTTPError as error:
        log.warning("No se pudo enviar correo transaccional: %s", type(error).__name__)
        registro.usado_en = ahora()
        db.commit()
        return False


def _vigente(fecha) -> bool:
    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=timezone.utc)
    return fecha > ahora()


def consumir(db: Session, token: str, proposito: str) -> Usuario | None:
    if len(token) < 40 or len(token) > 160:
        return None
    registro = db.scalar(select(TokenCorreo).where(
        TokenCorreo.token_hash == _hash(token), TokenCorreo.proposito == proposito,
        TokenCorreo.usado_en.is_(None),
    ).with_for_update())
    if registro is None or not _vigente(registro.vence_en):
        return None
    usuario = db.get(Usuario, registro.usuario_id)
    if usuario is None or not usuario.activo:
        return None
    registro.usado_en = ahora()
    return usuario
