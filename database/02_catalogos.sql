-- UrbanCloud AI: datos base (catálogos). Son necesarios para que la aplicación funcione.
-- Ejecutar después de 01_esquema.sql.
BEGIN;

INSERT INTO roles (nombre, created_at, updated_at) VALUES
    ('Ciudadano', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Operador', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Supervisor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Personal técnico', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Administrador', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO areas (nombre, created_at, updated_at) VALUES
    ('Alumbrado público', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Mantenimiento', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Servicios ambientales', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Áreas verdes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Vías y obras', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO categorias (nombre, created_at, updated_at) VALUES
    ('Iluminación', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Limpieza', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Vías y pistas', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Parques', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Servicios', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Otro', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO prioridades (nombre, nivel) VALUES ('Baja', 1), ('Media', 2), ('Alta', 3);

INSERT INTO estados_incidencia (nombre, created_at, updated_at) VALUES
    ('En revisión', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Derivado', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Asignado', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('En atención', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Atendido', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Cerrado', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Revisión solicitada', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Impedido', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO distritos (nombre, provincia, departamento, created_at, updated_at) VALUES
    ('Chimbote', 'Santa', 'Áncash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Nuevo Chimbote', 'Santa', 'Áncash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO configuraciones_sistema (clave, valor, descripcion, created_at, updated_at) VALUES
    ('UMBRAL_CONFIANZA_IA', '70', 'Umbral mínimo de confianza de IA en porcentaje', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ALERTAS_DUPLICADOS_ACTIVAS', 'true', 'Activa alertas de reportes cercanos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

COMMIT;
