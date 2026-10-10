"""Configuración por entorno; no contiene secretos de producción."""

import os
import secrets
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, Field


_secreto_desarrollo = secrets.token_urlsafe(48)


class Ajustes(BaseModel):
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://localhost/urbancloud_ai"
    frontend_origin: str = "http://localhost:5173"
    analisis_ia_url: str = "https://clasificador-incidencias-urbanas.vercel.app/api/clasificar"
    analisis_ia_timeout: int = Field(default=20, ge=1, le=60)
    analisis_ia_reintentos: int = Field(default=1, ge=0, le=1)
    secret_key: str = _secreto_desarrollo
    storage_backend: str = "local"
    storage_root: str = "./storage"
    s3_bucket: str = ""
    s3_endpoint_url: str = ""
    cookie_samesite: str = "lax"
    # Grupo de conexiones a PostgreSQL (por proceso). Los valores por defecto son los de SQLAlchemy.
    db_pool_size: int = Field(default=5, ge=1, le=100)
    db_max_overflow: int = Field(default=10, ge=0, le=100)
    db_pool_timeout: int = Field(default=30, ge=1, le=120)

    @property
    def secure_cookies(self) -> bool:
        return self.app_env == "production"


@lru_cache
def ajustes() -> Ajustes:
    load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)
    datos = {campo: os.getenv(campo.upper(), definicion.default)
             for campo, definicion in Ajustes.model_fields.items()}
    config = Ajustes.model_validate(datos)
    if config.app_env == "production" and len(config.secret_key) < 32:
        raise RuntimeError("SECRET_KEY debe contener al menos 32 caracteres en producción.")
    if config.app_env == "production" and config.storage_backend != "s3":
        raise RuntimeError("Producción requiere STORAGE_BACKEND=s3 para evidencias persistentes.")
    if config.app_env == "production" and not config.database_url.startswith("postgresql+psycopg://"):
        raise RuntimeError("Producción requiere PostgreSQL con psycopg.")
    if "*" in config.frontend_origin:
        raise RuntimeError("FRONTEND_ORIGIN debe indicar orígenes exactos.")
    if config.cookie_samesite not in {"lax", "strict", "none"}:
        raise RuntimeError("COOKIE_SAMESITE no válido.")
    if config.cookie_samesite == "none" and not config.secure_cookies:
        raise RuntimeError("SameSite=None requiere cookies Secure.")
    return config
