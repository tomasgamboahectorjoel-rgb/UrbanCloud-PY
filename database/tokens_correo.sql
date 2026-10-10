-- Tokens de un solo uso para verificar el correo y recuperar la contrasena (backend FastAPI).
-- Equivale a la migracion Alembic 0003_tokens_correo.
-- Ejecutar UNA vez en la base de datos (SQL Editor de Supabase). Solo agrega una tabla:
-- no modifica ninguna tabla existente, asi que el esquema anterior sigue funcionando.
-- Debe ejecutarse ANTES de desplegar la version del backend que envia correos.
BEGIN;

CREATE TABLE IF NOT EXISTS tokens_correo (
    id UUID PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
    proposito VARCHAR(20) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    vence_en TIMESTAMPTZ NOT NULL,
    usado_en TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_tokens_correo_usuario_id ON tokens_correo (usuario_id);

-- El backend se conecta directamente por PostgreSQL; con RLS activado y sin politicas,
-- la API publica de Supabase no puede leer esta tabla.
ALTER TABLE tokens_correo ENABLE ROW LEVEL SECURITY;

COMMIT;
