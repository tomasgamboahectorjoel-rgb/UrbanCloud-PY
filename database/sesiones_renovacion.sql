-- Sesiones revocables del backend FastAPI (access/refresh).
-- Equivale a la migracion Alembic 0002_sesiones_renovacion.
-- Ejecutar UNA vez en la base de datos (SQL Editor de Supabase). Solo agrega una tabla:
-- no modifica ninguna tabla existente, asi que el esquema anterior sigue funcionando.
BEGIN;

CREATE TABLE IF NOT EXISTS sesiones_renovacion (
    id UUID PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    vence_en TIMESTAMPTZ NOT NULL,
    revocada_en TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
);

-- El backend se conecta directamente por PostgreSQL; con RLS activado y sin politicas,
-- la API publica de Supabase no puede leer esta tabla.
ALTER TABLE sesiones_renovacion ENABLE ROW LEVEL SECURITY;

COMMIT;
