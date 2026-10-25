-- UrbanCloud AI: CUENTAS DE ACCESO Y DATOS DE EJEMPLO.
-- Es necesario: crea las cuentas de los cinco perfiles, sin las cuales no se puede iniciar sesión.
-- Las incidencias llevan el prefijo [Demo] y las rutas de archivo no existen en el almacenamiento.
-- Ejecutar después de 01_esquema.sql y 02_catalogos.sql, en una base nueva y vacía.
BEGIN;

-- Usuarios (contraseñas con bcrypt; ver LEEME.md para las credenciales de prueba).
INSERT INTO usuarios (nombre, email, email_verified_at, password, rol_id, area_id, activo, created_at, updated_at)
VALUES ('Ciudadano Demo', 'ciudadano.demo@urbancloudai.com', now(), '$2b$12$cJpXkQ6EZf6aFq3XsMIQaObR.fNLrpkNaQwKEerbY3nrQTAy.PLoS', (SELECT id FROM roles WHERE nombre = 'Ciudadano'), NULL, true, now(), now());
INSERT INTO usuarios (nombre, email, email_verified_at, password, rol_id, area_id, activo, created_at, updated_at)
VALUES ('Operador Demo', 'operador.demo@urbancloudai.com', now(), '$2b$12$BViMXD8BM6H4GnuRdsCrvems3OdDAzSjr765aI5A8qGf.7FC2o8Ri', (SELECT id FROM roles WHERE nombre = 'Operador'), NULL, true, now(), now());
INSERT INTO usuarios (nombre, email, email_verified_at, password, rol_id, area_id, activo, created_at, updated_at)
VALUES ('Supervisor Demo', 'supervisor.demo@urbancloudai.com', now(), '$2b$12$4HgRXPhvBa4nqM8.v.6dgeUGMPy7m.4jmPJBBRSvxJki2O5XNdUXm', (SELECT id FROM roles WHERE nombre = 'Supervisor'), NULL, true, now(), now());
INSERT INTO usuarios (nombre, email, email_verified_at, password, rol_id, area_id, activo, created_at, updated_at)
VALUES ('Técnico Demo Alumbrado', 'tecnico.alumbrado.demo@urbancloudai.com', now(), '$2b$12$otgi7D2ZB3n4a.j06eOMOuVkzt9k.21bvWEoYqHIOyAc1TzBiUUIq', (SELECT id FROM roles WHERE nombre = 'Personal técnico'), (SELECT id FROM areas WHERE nombre = 'Alumbrado público'), true, now(), now());
INSERT INTO usuarios (nombre, email, email_verified_at, password, rol_id, area_id, activo, created_at, updated_at)
VALUES ('Técnico Demo Mantenimiento', 'tecnico.mantenimiento.demo@urbancloudai.com', now(), '$2b$12$GrEY.oriafFk2dJtULxJeufL2KCHpCPsVEzcMxLCbmc.dyS06RJVa', (SELECT id FROM roles WHERE nombre = 'Personal técnico'), (SELECT id FROM areas WHERE nombre = 'Mantenimiento'), true, now(), now());
INSERT INTO usuarios (nombre, email, email_verified_at, password, rol_id, area_id, activo, created_at, updated_at)
VALUES ('Técnico Demo Ambiental', 'tecnico.ambiental.demo@urbancloudai.com', now(), '$2b$12$MNG9Rs8Kk/XLLxogLrCXweZ6rlUq0KoOnSRnNS0PzA4J6xRz6vSm.', (SELECT id FROM roles WHERE nombre = 'Personal técnico'), (SELECT id FROM areas WHERE nombre = 'Servicios ambientales'), true, now(), now());
INSERT INTO usuarios (nombre, email, email_verified_at, password, rol_id, area_id, activo, created_at, updated_at)
VALUES ('Técnico Demo Áreas verdes', 'tecnico.areasverdes.demo@urbancloudai.com', now(), '$2b$12$B2pCDAtbg3FAyDw3KMQmheqVSVTL35/m6EsPttYUT/BV4Tx/Qb/j6', (SELECT id FROM roles WHERE nombre = 'Personal técnico'), (SELECT id FROM areas WHERE nombre = 'Áreas verdes'), true, now(), now());
INSERT INTO usuarios (nombre, email, email_verified_at, password, rol_id, area_id, activo, created_at, updated_at)
VALUES ('Técnico Demo Vías', 'tecnico.vias.demo@urbancloudai.com', now(), '$2b$12$bAtMrrdyALmoPbxcC0HjlO0Hi.3D5ZGzgTJ2kNHOo/KHR4EU99kWW', (SELECT id FROM roles WHERE nombre = 'Personal técnico'), (SELECT id FROM areas WHERE nombre = 'Vías y obras'), true, now(), now());
INSERT INTO usuarios (nombre, email, email_verified_at, password, rol_id, area_id, activo, created_at, updated_at)
VALUES ('Administrador', 'admin@urbancloudai.com', now(), '$2b$12$Qa90Sj/gwnzfzFMGwbC5WOurEFSoL9t6LTy3ZqLHsNH3Mv/IqEQjm', (SELECT id FROM roles WHERE nombre = 'Administrador'), NULL, true, now(), now());

-- Una validación rechazada por la IA (no genera incidencia).
INSERT INTO validaciones_reporte (id, ciudadano_id, incidencia_id, titulo, descripcion, ruta_imagen, es_valido, motivo, confianza, created_at, updated_at)
VALUES ('69f60d16-1c89-535a-aae2-0cd65bb90f0c', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), NULL, '[Demo] Foto de un paisaje', 'Foto que no muestra ningún problema urbano.',
        'reportes/demo/rechazada.jpg', false, 'La imagen no corresponde a una incidencia urbana.', 0.9100, now() - interval '3 days', now() - interval '3 days');

-- Incidencia URB-2026-0001: En revisión
INSERT INTO incidencias (id, codigo, ciudadano_id, titulo, descripcion, categoria_id, prioridad_id, area_id, estado_id, distrito_id,
                        direccion, latitud, longitud, fecha_limite, fecha_cierre, created_at, updated_at)
VALUES ('52a3ef7a-95be-5a07-92d9-af48a384934a', 'URB-2026-0001', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '[Demo] Poste sin luz en la avenida Pardo', 'Desde hace tres noches el poste de la esquina no enciende y la cuadra queda a oscuras.',
        (SELECT id FROM categorias WHERE nombre = 'Iluminación'), (SELECT id FROM prioridades WHERE nombre = 'Alta'), (SELECT id FROM areas WHERE nombre = 'Alumbrado público'), (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'),
        (SELECT id FROM distritos WHERE nombre = 'Chimbote'), 'Av. Pardo cuadra 12', -9.075231, -78.593412,
        now() - interval '1 days' + interval '24 hours', NULL,
        now() - interval '1 days', now() - interval '0 days');
INSERT INTO validaciones_reporte (id, ciudadano_id, incidencia_id, titulo, descripcion, ruta_imagen, es_valido, confianza, created_at, updated_at)
VALUES ('a30d4e38-5c22-564b-9509-45486aa3a751', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '52a3ef7a-95be-5a07-92d9-af48a384934a', '[Demo] Poste sin luz en la avenida Pardo', 'Desde hace tres noches el poste de la esquina no enciende y la cuadra queda a oscuras.', 'reportes/demo/1.jpg', true, 0.9120,
        now() - interval '1 days', now() - interval '1 days');
INSERT INTO analisis_ia (id, incidencia_id, categoria_sugerida_id, prioridad_sugerida_id, area_sugerida_id, confianza, created_at, updated_at)
VALUES ('9cc19693-4ce5-5c20-937e-4fec3bafcc9f', '52a3ef7a-95be-5a07-92d9-af48a384934a', (SELECT id FROM categorias WHERE nombre = 'Iluminación'), (SELECT id FROM prioridades WHERE nombre = 'Alta'), (SELECT id FROM areas WHERE nombre = 'Alumbrado público'), 0.8150,
        now() - interval '1 days', now() - interval '1 days');
INSERT INTO evidencias_incidencia (id, incidencia_id, usuario_id, tipo, ruta_archivo, created_at, updated_at)
VALUES ('32872466-0d8a-5d2b-87cb-6c4330a105f3', '52a3ef7a-95be-5a07-92d9-af48a384934a', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'REPORTE', 'reportes/demo/1.jpg', now() - interval '1 days', now() - interval '1 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('52a3ef7a-95be-5a07-92d9-af48a384934a', NULL, (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'Reporte creado y validado por la IA.', now() - interval '1 days');
INSERT INTO notificaciones_incidencia (id, usuario_id, incidencia_id, titulo, mensaje, leida_en, created_at, updated_at)
VALUES ('7be3c5d0-2b60-5999-a614-15209d2213a0', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '52a3ef7a-95be-5a07-92d9-af48a384934a', 'Tu reporte fue registrado', 'El reporte URB-2026-0001 está en estado En revisión.',
        NULL, now() - interval '1 days', now() - interval '1 days');
INSERT INTO auditorias (usuario_id, incidencia_id, accion, entidad, entidad_id, valores_nuevos, created_at)
VALUES ((SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '52a3ef7a-95be-5a07-92d9-af48a384934a', 'reporte_creado', 'incidencias', '52a3ef7a-95be-5a07-92d9-af48a384934a', '{"codigo": "URB-2026-0001"}'::jsonb, now() - interval '1 days');
INSERT INTO seguidores_incidencia (incidencia_id, ciudadano_id, created_at, updated_at)
VALUES ('52a3ef7a-95be-5a07-92d9-af48a384934a', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), now(), now());

-- Incidencia URB-2026-0002: Derivado
INSERT INTO incidencias (id, codigo, ciudadano_id, titulo, descripcion, categoria_id, prioridad_id, area_id, estado_id, distrito_id,
                        direccion, latitud, longitud, fecha_limite, fecha_cierre, created_at, updated_at)
VALUES ('5b632983-96e2-5d20-a37c-b53180f442e3', 'URB-2026-0002', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '[Demo] Basura acumulada junto al mercado', 'Bolsas de basura acumuladas en la vereda desde el fin de semana, con mal olor.',
        (SELECT id FROM categorias WHERE nombre = 'Limpieza'), (SELECT id FROM prioridades WHERE nombre = 'Media'), (SELECT id FROM areas WHERE nombre = 'Servicios ambientales'), (SELECT id FROM estados_incidencia WHERE nombre = 'Derivado'),
        (SELECT id FROM distritos WHERE nombre = 'Chimbote'), 'Jr. Bolognesi cuadra 4', -9.077455, -78.591984,
        now() - interval '2 days' + interval '72 hours', NULL,
        now() - interval '2 days', now() - interval '1 days');
INSERT INTO validaciones_reporte (id, ciudadano_id, incidencia_id, titulo, descripcion, ruta_imagen, es_valido, confianza, created_at, updated_at)
VALUES ('0308e3ec-c9e3-5c00-aafd-e9196e2a55b9', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '5b632983-96e2-5d20-a37c-b53180f442e3', '[Demo] Basura acumulada junto al mercado', 'Bolsas de basura acumuladas en la vereda desde el fin de semana, con mal olor.', 'reportes/demo/2.jpg', true, 0.9220,
        now() - interval '2 days', now() - interval '2 days');
INSERT INTO analisis_ia (id, incidencia_id, categoria_sugerida_id, prioridad_sugerida_id, area_sugerida_id, confianza, created_at, updated_at)
VALUES ('d4e38d9f-9829-59e8-ad63-02524de39191', '5b632983-96e2-5d20-a37c-b53180f442e3', (SELECT id FROM categorias WHERE nombre = 'Limpieza'), (SELECT id FROM prioridades WHERE nombre = 'Media'), (SELECT id FROM areas WHERE nombre = 'Servicios ambientales'), 0.8250,
        now() - interval '2 days', now() - interval '2 days');
INSERT INTO evidencias_incidencia (id, incidencia_id, usuario_id, tipo, ruta_archivo, created_at, updated_at)
VALUES ('cc733dd8-c2ae-56b7-8dd0-4e256c93f5db', '5b632983-96e2-5d20-a37c-b53180f442e3', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'REPORTE', 'reportes/demo/2.jpg', now() - interval '2 days', now() - interval '2 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('5b632983-96e2-5d20-a37c-b53180f442e3', NULL, (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'Reporte creado y validado por la IA.', now() - interval '2 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('5b632983-96e2-5d20-a37c-b53180f442e3', (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM estados_incidencia WHERE nombre = 'Derivado'), (SELECT id FROM usuarios WHERE email = 'operador.demo@urbancloudai.com'), 'Clasificación confirmada y derivada.',
        now() - interval '2 days' + interval '4 hours');
INSERT INTO notificaciones_incidencia (id, usuario_id, incidencia_id, titulo, mensaje, leida_en, created_at, updated_at)
VALUES ('b0ebab80-cbbe-52ff-afdc-15ecbf66e3b4', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '5b632983-96e2-5d20-a37c-b53180f442e3', 'Tu reporte fue registrado', 'El reporte URB-2026-0002 está en estado Derivado.',
        now(), now() - interval '2 days', now() - interval '2 days');
INSERT INTO auditorias (usuario_id, incidencia_id, accion, entidad, entidad_id, valores_nuevos, created_at)
VALUES ((SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '5b632983-96e2-5d20-a37c-b53180f442e3', 'reporte_creado', 'incidencias', '5b632983-96e2-5d20-a37c-b53180f442e3', '{"codigo": "URB-2026-0002"}'::jsonb, now() - interval '2 days');

-- Incidencia URB-2026-0003: Asignado
INSERT INTO incidencias (id, codigo, ciudadano_id, titulo, descripcion, categoria_id, prioridad_id, area_id, estado_id, distrito_id,
                        direccion, latitud, longitud, fecha_limite, fecha_cierre, created_at, updated_at)
VALUES ('8c02d92d-a000-559d-9339-73b20f4478df', 'URB-2026-0003', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '[Demo] Hueco profundo en la pista', 'Hueco de unos 40 cm de profundidad que obliga a los autos a invadir el otro carril.',
        (SELECT id FROM categorias WHERE nombre = 'Vías y pistas'), (SELECT id FROM prioridades WHERE nombre = 'Alta'), (SELECT id FROM areas WHERE nombre = 'Vías y obras'), (SELECT id FROM estados_incidencia WHERE nombre = 'Asignado'),
        (SELECT id FROM distritos WHERE nombre = 'Nuevo Chimbote'), 'Av. Universitaria cuadra 8', -9.119022, -78.52267,
        now() - interval '4 days' + interval '24 hours', NULL,
        now() - interval '4 days', now() - interval '3 days');
INSERT INTO validaciones_reporte (id, ciudadano_id, incidencia_id, titulo, descripcion, ruta_imagen, es_valido, confianza, created_at, updated_at)
VALUES ('b9111d92-7ec8-5952-a991-55d64c4580a3', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '8c02d92d-a000-559d-9339-73b20f4478df', '[Demo] Hueco profundo en la pista', 'Hueco de unos 40 cm de profundidad que obliga a los autos a invadir el otro carril.', 'reportes/demo/3.jpg', true, 0.9320,
        now() - interval '4 days', now() - interval '4 days');
INSERT INTO analisis_ia (id, incidencia_id, categoria_sugerida_id, prioridad_sugerida_id, area_sugerida_id, confianza, created_at, updated_at)
VALUES ('e220f963-b019-5e7a-b60d-61092c029da1', '8c02d92d-a000-559d-9339-73b20f4478df', (SELECT id FROM categorias WHERE nombre = 'Vías y pistas'), (SELECT id FROM prioridades WHERE nombre = 'Alta'), (SELECT id FROM areas WHERE nombre = 'Vías y obras'), 0.8350,
        now() - interval '4 days', now() - interval '4 days');
INSERT INTO evidencias_incidencia (id, incidencia_id, usuario_id, tipo, ruta_archivo, created_at, updated_at)
VALUES ('5f0f8ebf-0251-58fb-8afb-1dc417d4c542', '8c02d92d-a000-559d-9339-73b20f4478df', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'REPORTE', 'reportes/demo/3.jpg', now() - interval '4 days', now() - interval '4 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('8c02d92d-a000-559d-9339-73b20f4478df', NULL, (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'Reporte creado y validado por la IA.', now() - interval '4 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('8c02d92d-a000-559d-9339-73b20f4478df', (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM estados_incidencia WHERE nombre = 'Derivado'), (SELECT id FROM usuarios WHERE email = 'operador.demo@urbancloudai.com'), 'Clasificación confirmada y derivada.',
        now() - interval '4 days' + interval '4 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('8c02d92d-a000-559d-9339-73b20f4478df', (SELECT id FROM estados_incidencia WHERE nombre = 'Derivado'), (SELECT id FROM estados_incidencia WHERE nombre = 'Asignado'), (SELECT id FROM usuarios WHERE email = 'supervisor.demo@urbancloudai.com'), 'Asignado a técnico del área.',
        now() - interval '4 days' + interval '8 hours');
INSERT INTO asignaciones_incidencia (incidencia_id, tecnico_id, asignado_por, fecha_asignacion, fecha_fin, activa, created_at, updated_at)
VALUES ('8c02d92d-a000-559d-9339-73b20f4478df', (SELECT id FROM usuarios WHERE email = 'tecnico.vias.demo@urbancloudai.com'), (SELECT id FROM usuarios WHERE email = 'supervisor.demo@urbancloudai.com'), now() - interval '4 days' + interval '8 hours', NULL, true,
        now() - interval '4 days', now() - interval '4 days');
INSERT INTO notificaciones_incidencia (id, usuario_id, incidencia_id, titulo, mensaje, leida_en, created_at, updated_at)
VALUES ('aa3c6983-4725-59b9-856b-a42eafc5c5e8', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '8c02d92d-a000-559d-9339-73b20f4478df', 'Tu reporte fue registrado', 'El reporte URB-2026-0003 está en estado Asignado.',
        NULL, now() - interval '4 days', now() - interval '4 days');
INSERT INTO auditorias (usuario_id, incidencia_id, accion, entidad, entidad_id, valores_nuevos, created_at)
VALUES ((SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '8c02d92d-a000-559d-9339-73b20f4478df', 'reporte_creado', 'incidencias', '8c02d92d-a000-559d-9339-73b20f4478df', '{"codigo": "URB-2026-0003"}'::jsonb, now() - interval '4 days');
INSERT INTO seguidores_incidencia (incidencia_id, ciudadano_id, created_at, updated_at)
VALUES ('8c02d92d-a000-559d-9339-73b20f4478df', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), now(), now());

-- Incidencia URB-2026-0004: En atención
INSERT INTO incidencias (id, codigo, ciudadano_id, titulo, descripcion, categoria_id, prioridad_id, area_id, estado_id, distrito_id,
                        direccion, latitud, longitud, fecha_limite, fecha_cierre, created_at, updated_at)
VALUES ('fb98ecfd-7c92-5e00-b56d-3dd59ffc6d3f', 'URB-2026-0004', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '[Demo] Fuga de agua en la vereda', 'Sale agua limpia de una tubería rota y forma un charco que crece cada día.',
        (SELECT id FROM categorias WHERE nombre = 'Servicios'), (SELECT id FROM prioridades WHERE nombre = 'Media'), (SELECT id FROM areas WHERE nombre = 'Mantenimiento'), (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'),
        (SELECT id FROM distritos WHERE nombre = 'Nuevo Chimbote'), 'Calle Los Pinos 215', -9.123308, -78.519047,
        now() - interval '6 days' + interval '72 hours', NULL,
        now() - interval '6 days', now() - interval '5 days');
INSERT INTO validaciones_reporte (id, ciudadano_id, incidencia_id, titulo, descripcion, ruta_imagen, es_valido, confianza, created_at, updated_at)
VALUES ('291fd723-d7b2-5315-b9ac-1aa08fa19be7', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'fb98ecfd-7c92-5e00-b56d-3dd59ffc6d3f', '[Demo] Fuga de agua en la vereda', 'Sale agua limpia de una tubería rota y forma un charco que crece cada día.', 'reportes/demo/4.jpg', true, 0.9420,
        now() - interval '6 days', now() - interval '6 days');
INSERT INTO analisis_ia (id, incidencia_id, categoria_sugerida_id, prioridad_sugerida_id, area_sugerida_id, confianza, created_at, updated_at)
VALUES ('45a27085-9ca8-52af-8090-990db1e5a45a', 'fb98ecfd-7c92-5e00-b56d-3dd59ffc6d3f', (SELECT id FROM categorias WHERE nombre = 'Servicios'), (SELECT id FROM prioridades WHERE nombre = 'Media'), (SELECT id FROM areas WHERE nombre = 'Mantenimiento'), 0.8450,
        now() - interval '6 days', now() - interval '6 days');
INSERT INTO evidencias_incidencia (id, incidencia_id, usuario_id, tipo, ruta_archivo, created_at, updated_at)
VALUES ('f458b64e-5f52-5ede-8174-c25f426ca377', 'fb98ecfd-7c92-5e00-b56d-3dd59ffc6d3f', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'REPORTE', 'reportes/demo/4.jpg', now() - interval '6 days', now() - interval '6 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('fb98ecfd-7c92-5e00-b56d-3dd59ffc6d3f', NULL, (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'Reporte creado y validado por la IA.', now() - interval '6 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('fb98ecfd-7c92-5e00-b56d-3dd59ffc6d3f', (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM estados_incidencia WHERE nombre = 'Derivado'), (SELECT id FROM usuarios WHERE email = 'operador.demo@urbancloudai.com'), 'Clasificación confirmada y derivada.',
        now() - interval '6 days' + interval '4 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('fb98ecfd-7c92-5e00-b56d-3dd59ffc6d3f', (SELECT id FROM estados_incidencia WHERE nombre = 'Derivado'), (SELECT id FROM estados_incidencia WHERE nombre = 'Asignado'), (SELECT id FROM usuarios WHERE email = 'supervisor.demo@urbancloudai.com'), 'Asignado a técnico del área.',
        now() - interval '6 days' + interval '8 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('fb98ecfd-7c92-5e00-b56d-3dd59ffc6d3f', (SELECT id FROM estados_incidencia WHERE nombre = 'Asignado'), (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'), (SELECT id FROM usuarios WHERE email = 'tecnico.mantenimiento.demo@urbancloudai.com'), 'Se inicia la atención en el lugar.',
        now() - interval '6 days' + interval '12 hours');
INSERT INTO asignaciones_incidencia (incidencia_id, tecnico_id, asignado_por, fecha_asignacion, fecha_fin, activa, created_at, updated_at)
VALUES ('fb98ecfd-7c92-5e00-b56d-3dd59ffc6d3f', (SELECT id FROM usuarios WHERE email = 'tecnico.mantenimiento.demo@urbancloudai.com'), (SELECT id FROM usuarios WHERE email = 'supervisor.demo@urbancloudai.com'), now() - interval '6 days' + interval '8 hours', NULL, true,
        now() - interval '6 days', now() - interval '6 days');
INSERT INTO actualizaciones_incidencia (incidencia_id, usuario_id, estado_id, comentario, created_at, updated_at)
VALUES ('fb98ecfd-7c92-5e00-b56d-3dd59ffc6d3f', (SELECT id FROM usuarios WHERE email = 'tecnico.mantenimiento.demo@urbancloudai.com'), (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'), 'Se inicia la atención en el lugar.',
        now() - interval '6 days' + interval '12 hours', now() - interval '6 days' + interval '12 hours');
INSERT INTO notificaciones_incidencia (id, usuario_id, incidencia_id, titulo, mensaje, leida_en, created_at, updated_at)
VALUES ('81ad69d7-cbc7-5ed7-808e-ab4d482b197d', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'fb98ecfd-7c92-5e00-b56d-3dd59ffc6d3f', 'Tu reporte fue registrado', 'El reporte URB-2026-0004 está en estado En atención.',
        now(), now() - interval '6 days', now() - interval '6 days');
INSERT INTO auditorias (usuario_id, incidencia_id, accion, entidad, entidad_id, valores_nuevos, created_at)
VALUES ((SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'fb98ecfd-7c92-5e00-b56d-3dd59ffc6d3f', 'reporte_creado', 'incidencias', 'fb98ecfd-7c92-5e00-b56d-3dd59ffc6d3f', '{"codigo": "URB-2026-0004"}'::jsonb, now() - interval '6 days');

-- Incidencia URB-2026-0005: Atendido
INSERT INTO incidencias (id, codigo, ciudadano_id, titulo, descripcion, categoria_id, prioridad_id, area_id, estado_id, distrito_id,
                        direccion, latitud, longitud, fecha_limite, fecha_cierre, created_at, updated_at)
VALUES ('53103ae4-e9c3-5366-9fd4-343611437d6b', 'URB-2026-0005', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '[Demo] Árbol con ramas sobre el cableado', 'Las ramas tocan los cables y se pueden caer con el viento de la tarde.',
        (SELECT id FROM categorias WHERE nombre = 'Parques'), (SELECT id FROM prioridades WHERE nombre = 'Media'), (SELECT id FROM areas WHERE nombre = 'Áreas verdes'), (SELECT id FROM estados_incidencia WHERE nombre = 'Atendido'),
        (SELECT id FROM distritos WHERE nombre = 'Chimbote'), 'Parque Zonal 2, lado norte', -9.080871, -78.584259,
        now() - interval '8 days' + interval '72 hours', NULL,
        now() - interval '8 days', now() - interval '7 days');
INSERT INTO validaciones_reporte (id, ciudadano_id, incidencia_id, titulo, descripcion, ruta_imagen, es_valido, confianza, created_at, updated_at)
VALUES ('c62f6c7f-3830-544e-acf2-5f141076d668', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '53103ae4-e9c3-5366-9fd4-343611437d6b', '[Demo] Árbol con ramas sobre el cableado', 'Las ramas tocan los cables y se pueden caer con el viento de la tarde.', 'reportes/demo/5.jpg', true, 0.9520,
        now() - interval '8 days', now() - interval '8 days');
INSERT INTO analisis_ia (id, incidencia_id, categoria_sugerida_id, prioridad_sugerida_id, area_sugerida_id, confianza, created_at, updated_at)
VALUES ('0325a6ff-2a5c-523d-bf8a-850da33c8b78', '53103ae4-e9c3-5366-9fd4-343611437d6b', (SELECT id FROM categorias WHERE nombre = 'Parques'), (SELECT id FROM prioridades WHERE nombre = 'Media'), (SELECT id FROM areas WHERE nombre = 'Áreas verdes'), 0.8550,
        now() - interval '8 days', now() - interval '8 days');
INSERT INTO evidencias_incidencia (id, incidencia_id, usuario_id, tipo, ruta_archivo, created_at, updated_at)
VALUES ('f81cda1b-3d78-54a7-aa44-53ea23644515', '53103ae4-e9c3-5366-9fd4-343611437d6b', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'REPORTE', 'reportes/demo/5.jpg', now() - interval '8 days', now() - interval '8 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('53103ae4-e9c3-5366-9fd4-343611437d6b', NULL, (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'Reporte creado y validado por la IA.', now() - interval '8 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('53103ae4-e9c3-5366-9fd4-343611437d6b', (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM estados_incidencia WHERE nombre = 'Derivado'), (SELECT id FROM usuarios WHERE email = 'operador.demo@urbancloudai.com'), 'Clasificación confirmada y derivada.',
        now() - interval '8 days' + interval '4 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('53103ae4-e9c3-5366-9fd4-343611437d6b', (SELECT id FROM estados_incidencia WHERE nombre = 'Derivado'), (SELECT id FROM estados_incidencia WHERE nombre = 'Asignado'), (SELECT id FROM usuarios WHERE email = 'supervisor.demo@urbancloudai.com'), 'Asignado a técnico del área.',
        now() - interval '8 days' + interval '8 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('53103ae4-e9c3-5366-9fd4-343611437d6b', (SELECT id FROM estados_incidencia WHERE nombre = 'Asignado'), (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'), (SELECT id FROM usuarios WHERE email = 'tecnico.areasverdes.demo@urbancloudai.com'), 'Se inicia la atención en el lugar.',
        now() - interval '8 days' + interval '12 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('53103ae4-e9c3-5366-9fd4-343611437d6b', (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'), (SELECT id FROM estados_incidencia WHERE nombre = 'Atendido'), (SELECT id FROM usuarios WHERE email = 'tecnico.areasverdes.demo@urbancloudai.com'), 'Trabajo concluido, se adjunta foto.',
        now() - interval '8 days' + interval '16 hours');
INSERT INTO asignaciones_incidencia (incidencia_id, tecnico_id, asignado_por, fecha_asignacion, fecha_fin, activa, created_at, updated_at)
VALUES ('53103ae4-e9c3-5366-9fd4-343611437d6b', (SELECT id FROM usuarios WHERE email = 'tecnico.areasverdes.demo@urbancloudai.com'), (SELECT id FROM usuarios WHERE email = 'supervisor.demo@urbancloudai.com'), now() - interval '8 days' + interval '8 hours', NULL, true,
        now() - interval '8 days', now() - interval '8 days');
INSERT INTO actualizaciones_incidencia (incidencia_id, usuario_id, estado_id, comentario, created_at, updated_at)
VALUES ('53103ae4-e9c3-5366-9fd4-343611437d6b', (SELECT id FROM usuarios WHERE email = 'tecnico.areasverdes.demo@urbancloudai.com'), (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'), 'Se inicia la atención en el lugar.',
        now() - interval '8 days' + interval '12 hours', now() - interval '8 days' + interval '12 hours');
INSERT INTO actualizaciones_incidencia (incidencia_id, usuario_id, estado_id, comentario, created_at, updated_at)
VALUES ('53103ae4-e9c3-5366-9fd4-343611437d6b', (SELECT id FROM usuarios WHERE email = 'tecnico.areasverdes.demo@urbancloudai.com'), (SELECT id FROM estados_incidencia WHERE nombre = 'Atendido'), 'Trabajo concluido, se adjunta foto.',
        now() - interval '8 days' + interval '16 hours', now() - interval '8 days' + interval '16 hours');
INSERT INTO evidencias_incidencia (id, incidencia_id, usuario_id, tipo, ruta_archivo, created_at, updated_at)
VALUES ('a5974f6b-1e6d-5d64-8c62-b54e458f9046', '53103ae4-e9c3-5366-9fd4-343611437d6b', (SELECT id FROM usuarios WHERE email = 'tecnico.areasverdes.demo@urbancloudai.com'), 'CIERRE', 'atenciones/demo/5.jpg',
        now() - interval '8 days' + interval '16 hours', now() - interval '8 days' + interval '16 hours');
INSERT INTO notificaciones_incidencia (id, usuario_id, incidencia_id, titulo, mensaje, leida_en, created_at, updated_at)
VALUES ('4616a1f0-5ad7-5e51-8922-ce51bc9bd6dc', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '53103ae4-e9c3-5366-9fd4-343611437d6b', 'Tu reporte fue registrado', 'El reporte URB-2026-0005 está en estado Atendido.',
        NULL, now() - interval '8 days', now() - interval '8 days');
INSERT INTO auditorias (usuario_id, incidencia_id, accion, entidad, entidad_id, valores_nuevos, created_at)
VALUES ((SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '53103ae4-e9c3-5366-9fd4-343611437d6b', 'reporte_creado', 'incidencias', '53103ae4-e9c3-5366-9fd4-343611437d6b', '{"codigo": "URB-2026-0005"}'::jsonb, now() - interval '8 days');
INSERT INTO seguidores_incidencia (incidencia_id, ciudadano_id, created_at, updated_at)
VALUES ('53103ae4-e9c3-5366-9fd4-343611437d6b', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), now(), now());

-- Incidencia URB-2026-0006: Cerrado
INSERT INTO incidencias (id, codigo, ciudadano_id, titulo, descripcion, categoria_id, prioridad_id, area_id, estado_id, distrito_id,
                        direccion, latitud, longitud, fecha_limite, fecha_cierre, created_at, updated_at)
VALUES ('359399aa-3d94-5699-9985-da692883b986', 'URB-2026-0006', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '[Demo] Desmonte abandonado en la berma', 'Montículo de escombros que bloquea el paso de peatones.',
        (SELECT id FROM categorias WHERE nombre = 'Limpieza'), (SELECT id FROM prioridades WHERE nombre = 'Baja'), (SELECT id FROM areas WHERE nombre = 'Servicios ambientales'), (SELECT id FROM estados_incidencia WHERE nombre = 'Cerrado'),
        (SELECT id FROM distritos WHERE nombre = 'Nuevo Chimbote'), 'Av. Anchoveta cuadra 3', -9.130119, -78.517364,
        now() - interval '15 days' + interval '168 hours', now() - interval '15 days' + interval '5 days',
        now() - interval '15 days', now() - interval '14 days');
INSERT INTO validaciones_reporte (id, ciudadano_id, incidencia_id, titulo, descripcion, ruta_imagen, es_valido, confianza, created_at, updated_at)
VALUES ('8a084bac-0e84-5c9e-af02-c0c4c95dcba3', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '359399aa-3d94-5699-9985-da692883b986', '[Demo] Desmonte abandonado en la berma', 'Montículo de escombros que bloquea el paso de peatones.', 'reportes/demo/6.jpg', true, 0.9620,
        now() - interval '15 days', now() - interval '15 days');
INSERT INTO analisis_ia (id, incidencia_id, categoria_sugerida_id, prioridad_sugerida_id, area_sugerida_id, confianza, created_at, updated_at)
VALUES ('691a93ed-8dcf-5a57-916c-14c80e47c237', '359399aa-3d94-5699-9985-da692883b986', (SELECT id FROM categorias WHERE nombre = 'Limpieza'), (SELECT id FROM prioridades WHERE nombre = 'Baja'), (SELECT id FROM areas WHERE nombre = 'Servicios ambientales'), 0.8650,
        now() - interval '15 days', now() - interval '15 days');
INSERT INTO evidencias_incidencia (id, incidencia_id, usuario_id, tipo, ruta_archivo, created_at, updated_at)
VALUES ('a8f7e66a-9f57-586e-90d5-9e913b5dc513', '359399aa-3d94-5699-9985-da692883b986', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'REPORTE', 'reportes/demo/6.jpg', now() - interval '15 days', now() - interval '15 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('359399aa-3d94-5699-9985-da692883b986', NULL, (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'Reporte creado y validado por la IA.', now() - interval '15 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('359399aa-3d94-5699-9985-da692883b986', (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM estados_incidencia WHERE nombre = 'Derivado'), (SELECT id FROM usuarios WHERE email = 'operador.demo@urbancloudai.com'), 'Clasificación confirmada y derivada.',
        now() - interval '15 days' + interval '4 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('359399aa-3d94-5699-9985-da692883b986', (SELECT id FROM estados_incidencia WHERE nombre = 'Derivado'), (SELECT id FROM estados_incidencia WHERE nombre = 'Asignado'), (SELECT id FROM usuarios WHERE email = 'supervisor.demo@urbancloudai.com'), 'Asignado a técnico del área.',
        now() - interval '15 days' + interval '8 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('359399aa-3d94-5699-9985-da692883b986', (SELECT id FROM estados_incidencia WHERE nombre = 'Asignado'), (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'), (SELECT id FROM usuarios WHERE email = 'tecnico.ambiental.demo@urbancloudai.com'), 'Se inicia la atención en el lugar.',
        now() - interval '15 days' + interval '12 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('359399aa-3d94-5699-9985-da692883b986', (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'), (SELECT id FROM estados_incidencia WHERE nombre = 'Atendido'), (SELECT id FROM usuarios WHERE email = 'tecnico.ambiental.demo@urbancloudai.com'), 'Trabajo concluido, se adjunta foto.',
        now() - interval '15 days' + interval '16 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('359399aa-3d94-5699-9985-da692883b986', (SELECT id FROM estados_incidencia WHERE nombre = 'Atendido'), (SELECT id FROM estados_incidencia WHERE nombre = 'Cerrado'), (SELECT id FROM usuarios WHERE email = 'supervisor.demo@urbancloudai.com'), 'Cierre aprobado.',
        now() - interval '15 days' + interval '20 hours');
INSERT INTO asignaciones_incidencia (incidencia_id, tecnico_id, asignado_por, fecha_asignacion, fecha_fin, activa, created_at, updated_at)
VALUES ('359399aa-3d94-5699-9985-da692883b986', (SELECT id FROM usuarios WHERE email = 'tecnico.ambiental.demo@urbancloudai.com'), (SELECT id FROM usuarios WHERE email = 'supervisor.demo@urbancloudai.com'), now() - interval '15 days' + interval '8 hours', now() - interval '15 days' + interval '2 days', false,
        now() - interval '15 days', now() - interval '15 days');
INSERT INTO actualizaciones_incidencia (incidencia_id, usuario_id, estado_id, comentario, created_at, updated_at)
VALUES ('359399aa-3d94-5699-9985-da692883b986', (SELECT id FROM usuarios WHERE email = 'tecnico.ambiental.demo@urbancloudai.com'), (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'), 'Se inicia la atención en el lugar.',
        now() - interval '15 days' + interval '12 hours', now() - interval '15 days' + interval '12 hours');
INSERT INTO actualizaciones_incidencia (incidencia_id, usuario_id, estado_id, comentario, created_at, updated_at)
VALUES ('359399aa-3d94-5699-9985-da692883b986', (SELECT id FROM usuarios WHERE email = 'tecnico.ambiental.demo@urbancloudai.com'), (SELECT id FROM estados_incidencia WHERE nombre = 'Atendido'), 'Trabajo concluido, se adjunta foto.',
        now() - interval '15 days' + interval '16 hours', now() - interval '15 days' + interval '16 hours');
INSERT INTO evidencias_incidencia (id, incidencia_id, usuario_id, tipo, ruta_archivo, created_at, updated_at)
VALUES ('e2d042fd-74a5-594d-beef-a9d63edd678e', '359399aa-3d94-5699-9985-da692883b986', (SELECT id FROM usuarios WHERE email = 'tecnico.ambiental.demo@urbancloudai.com'), 'CIERRE', 'atenciones/demo/6.jpg',
        now() - interval '15 days' + interval '16 hours', now() - interval '15 days' + interval '16 hours');
INSERT INTO notificaciones_incidencia (id, usuario_id, incidencia_id, titulo, mensaje, leida_en, created_at, updated_at)
VALUES ('6dcdb703-655a-5276-b6c3-26739ac9d6b1', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '359399aa-3d94-5699-9985-da692883b986', 'Tu reporte fue registrado', 'El reporte URB-2026-0006 está en estado Cerrado.',
        now(), now() - interval '15 days', now() - interval '15 days');
INSERT INTO auditorias (usuario_id, incidencia_id, accion, entidad, entidad_id, valores_nuevos, created_at)
VALUES ((SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '359399aa-3d94-5699-9985-da692883b986', 'reporte_creado', 'incidencias', '359399aa-3d94-5699-9985-da692883b986', '{"codigo": "URB-2026-0006"}'::jsonb, now() - interval '15 days');

-- Incidencia URB-2026-0007: Impedido
INSERT INTO incidencias (id, codigo, ciudadano_id, titulo, descripcion, categoria_id, prioridad_id, area_id, estado_id, distrito_id,
                        direccion, latitud, longitud, fecha_limite, fecha_cierre, created_at, updated_at)
VALUES ('b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', 'URB-2026-0007', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '[Demo] Jardinera dañada en el óvalo', 'La jardinera central está rota y las plantas se secaron.',
        (SELECT id FROM categorias WHERE nombre = 'Parques'), (SELECT id FROM prioridades WHERE nombre = 'Baja'), (SELECT id FROM areas WHERE nombre = 'Áreas verdes'), (SELECT id FROM estados_incidencia WHERE nombre = 'Impedido'),
        (SELECT id FROM distritos WHERE nombre = 'Chimbote'), 'Óvalo La Marina', -9.073144, -78.596731,
        now() - interval '10 days' + interval '168 hours', NULL,
        now() - interval '10 days', now() - interval '9 days');
INSERT INTO validaciones_reporte (id, ciudadano_id, incidencia_id, titulo, descripcion, ruta_imagen, es_valido, confianza, created_at, updated_at)
VALUES ('5dc103c5-f2c8-5941-ae7a-cfbe4e0e8134', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', '[Demo] Jardinera dañada en el óvalo', 'La jardinera central está rota y las plantas se secaron.', 'reportes/demo/7.jpg', true, 0.9720,
        now() - interval '10 days', now() - interval '10 days');
INSERT INTO analisis_ia (id, incidencia_id, categoria_sugerida_id, prioridad_sugerida_id, area_sugerida_id, confianza, created_at, updated_at)
VALUES ('5029d193-1bf2-5173-a7ef-f3ff7d066958', 'b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', (SELECT id FROM categorias WHERE nombre = 'Parques'), (SELECT id FROM prioridades WHERE nombre = 'Baja'), (SELECT id FROM areas WHERE nombre = 'Áreas verdes'), 0.8750,
        now() - interval '10 days', now() - interval '10 days');
INSERT INTO evidencias_incidencia (id, incidencia_id, usuario_id, tipo, ruta_archivo, created_at, updated_at)
VALUES ('a12e7a14-04bf-5708-b1ce-b4e78bf45e85', 'b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'REPORTE', 'reportes/demo/7.jpg', now() - interval '10 days', now() - interval '10 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', NULL, (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'Reporte creado y validado por la IA.', now() - interval '10 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM estados_incidencia WHERE nombre = 'Derivado'), (SELECT id FROM usuarios WHERE email = 'operador.demo@urbancloudai.com'), 'Clasificación confirmada y derivada.',
        now() - interval '10 days' + interval '4 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', (SELECT id FROM estados_incidencia WHERE nombre = 'Derivado'), (SELECT id FROM estados_incidencia WHERE nombre = 'Asignado'), (SELECT id FROM usuarios WHERE email = 'supervisor.demo@urbancloudai.com'), 'Asignado a técnico del área.',
        now() - interval '10 days' + interval '8 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', (SELECT id FROM estados_incidencia WHERE nombre = 'Asignado'), (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'), (SELECT id FROM usuarios WHERE email = 'tecnico.areasverdes.demo@urbancloudai.com'), 'Se inicia la atención en el lugar.',
        now() - interval '10 days' + interval '12 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'), (SELECT id FROM estados_incidencia WHERE nombre = 'Impedido'), (SELECT id FROM usuarios WHERE email = 'tecnico.areasverdes.demo@urbancloudai.com'), 'No se puede avanzar: falta de materiales.',
        now() - interval '10 days' + interval '16 hours');
INSERT INTO asignaciones_incidencia (incidencia_id, tecnico_id, asignado_por, fecha_asignacion, fecha_fin, activa, created_at, updated_at)
VALUES ('b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', (SELECT id FROM usuarios WHERE email = 'tecnico.areasverdes.demo@urbancloudai.com'), (SELECT id FROM usuarios WHERE email = 'supervisor.demo@urbancloudai.com'), now() - interval '10 days' + interval '8 hours', now() - interval '10 days' + interval '2 days', false,
        now() - interval '10 days', now() - interval '10 days');
INSERT INTO actualizaciones_incidencia (incidencia_id, usuario_id, estado_id, comentario, created_at, updated_at)
VALUES ('b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', (SELECT id FROM usuarios WHERE email = 'tecnico.areasverdes.demo@urbancloudai.com'), (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'), 'Se inicia la atención en el lugar.',
        now() - interval '10 days' + interval '12 hours', now() - interval '10 days' + interval '12 hours');
INSERT INTO actualizaciones_incidencia (incidencia_id, usuario_id, estado_id, comentario, created_at, updated_at)
VALUES ('b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', (SELECT id FROM usuarios WHERE email = 'tecnico.areasverdes.demo@urbancloudai.com'), (SELECT id FROM estados_incidencia WHERE nombre = 'Impedido'), 'No se puede avanzar: falta de materiales.',
        now() - interval '10 days' + interval '16 hours', now() - interval '10 days' + interval '16 hours');
INSERT INTO notificaciones_incidencia (id, usuario_id, incidencia_id, titulo, mensaje, leida_en, created_at, updated_at)
VALUES ('09713475-d585-52af-8236-a3b86e6b496a', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', 'Tu reporte fue registrado', 'El reporte URB-2026-0007 está en estado Impedido.',
        NULL, now() - interval '10 days', now() - interval '10 days');
INSERT INTO auditorias (usuario_id, incidencia_id, accion, entidad, entidad_id, valores_nuevos, created_at)
VALUES ((SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', 'reporte_creado', 'incidencias', 'b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', '{"codigo": "URB-2026-0007"}'::jsonb, now() - interval '10 days');
INSERT INTO seguidores_incidencia (incidencia_id, ciudadano_id, created_at, updated_at)
VALUES ('b019cb5a-0c3f-5e71-8ea7-c7d00d3bb4d8', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), now(), now());

-- Incidencia URB-2026-0008: Revisión solicitada
INSERT INTO incidencias (id, codigo, ciudadano_id, titulo, descripcion, categoria_id, prioridad_id, area_id, estado_id, distrito_id,
                        direccion, latitud, longitud, fecha_limite, fecha_cierre, created_at, updated_at)
VALUES ('e7a46b24-eae5-5f7c-9b83-ec63e24860a1', 'URB-2026-0008', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), '[Demo] Luminarias apagadas en el malecón', 'Cinco luminarias seguidas apagadas, el tramo es inseguro de noche.',
        (SELECT id FROM categorias WHERE nombre = 'Iluminación'), (SELECT id FROM prioridades WHERE nombre = 'Media'), (SELECT id FROM areas WHERE nombre = 'Alumbrado público'), (SELECT id FROM estados_incidencia WHERE nombre = 'Revisión solicitada'),
        (SELECT id FROM distritos WHERE nombre = 'Chimbote'), 'Malecón Grau, tramo central', -9.069057, -78.601223,
        now() - interval '20 days' + interval '72 hours', NULL,
        now() - interval '20 days', now() - interval '19 days');
INSERT INTO validaciones_reporte (id, ciudadano_id, incidencia_id, titulo, descripcion, ruta_imagen, es_valido, confianza, created_at, updated_at)
VALUES ('1b74d5c8-0e81-5959-af8f-ef5244cf26a6', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'e7a46b24-eae5-5f7c-9b83-ec63e24860a1', '[Demo] Luminarias apagadas en el malecón', 'Cinco luminarias seguidas apagadas, el tramo es inseguro de noche.', 'reportes/demo/8.jpg', true, 0.9820,
        now() - interval '20 days', now() - interval '20 days');
INSERT INTO analisis_ia (id, incidencia_id, categoria_sugerida_id, prioridad_sugerida_id, area_sugerida_id, confianza, created_at, updated_at)
VALUES ('e1f7c96f-99ec-5a37-80c5-ce4ef7acff1e', 'e7a46b24-eae5-5f7c-9b83-ec63e24860a1', (SELECT id FROM categorias WHERE nombre = 'Iluminación'), (SELECT id FROM prioridades WHERE nombre = 'Media'), (SELECT id FROM areas WHERE nombre = 'Alumbrado público'), 0.8850,
        now() - interval '20 days', now() - interval '20 days');
INSERT INTO evidencias_incidencia (id, incidencia_id, usuario_id, tipo, ruta_archivo, created_at, updated_at)
VALUES ('b4f28e4b-4921-5c94-b3a8-88b94c772f7d', 'e7a46b24-eae5-5f7c-9b83-ec63e24860a1', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'REPORTE', 'reportes/demo/8.jpg', now() - interval '20 days', now() - interval '20 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('e7a46b24-eae5-5f7c-9b83-ec63e24860a1', NULL, (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'Reporte creado y validado por la IA.', now() - interval '20 days');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('e7a46b24-eae5-5f7c-9b83-ec63e24860a1', (SELECT id FROM estados_incidencia WHERE nombre = 'En revisión'), (SELECT id FROM estados_incidencia WHERE nombre = 'Derivado'), (SELECT id FROM usuarios WHERE email = 'operador.demo@urbancloudai.com'), 'Clasificación confirmada y derivada.',
        now() - interval '20 days' + interval '4 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('e7a46b24-eae5-5f7c-9b83-ec63e24860a1', (SELECT id FROM estados_incidencia WHERE nombre = 'Derivado'), (SELECT id FROM estados_incidencia WHERE nombre = 'Asignado'), (SELECT id FROM usuarios WHERE email = 'supervisor.demo@urbancloudai.com'), 'Asignado a técnico del área.',
        now() - interval '20 days' + interval '8 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('e7a46b24-eae5-5f7c-9b83-ec63e24860a1', (SELECT id FROM estados_incidencia WHERE nombre = 'Asignado'), (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'), (SELECT id FROM usuarios WHERE email = 'tecnico.alumbrado.demo@urbancloudai.com'), 'Se inicia la atención en el lugar.',
        now() - interval '20 days' + interval '12 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('e7a46b24-eae5-5f7c-9b83-ec63e24860a1', (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'), (SELECT id FROM estados_incidencia WHERE nombre = 'Atendido'), (SELECT id FROM usuarios WHERE email = 'tecnico.alumbrado.demo@urbancloudai.com'), 'Trabajo concluido, se adjunta foto.',
        now() - interval '20 days' + interval '16 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('e7a46b24-eae5-5f7c-9b83-ec63e24860a1', (SELECT id FROM estados_incidencia WHERE nombre = 'Atendido'), (SELECT id FROM estados_incidencia WHERE nombre = 'Cerrado'), (SELECT id FROM usuarios WHERE email = 'supervisor.demo@urbancloudai.com'), 'Cierre aprobado.',
        now() - interval '20 days' + interval '20 hours');
INSERT INTO historial_estados_incidencia (incidencia_id, estado_anterior_id, estado_nuevo_id, cambiado_por, comentario, created_at)
VALUES ('e7a46b24-eae5-5f7c-9b83-ec63e24860a1', (SELECT id FROM estados_incidencia WHERE nombre = 'Cerrado'), (SELECT id FROM estados_incidencia WHERE nombre = 'Revisión solicitada'), (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'El problema reapareció a los pocos días.',
        now() - interval '20 days' + interval '24 hours');
INSERT INTO asignaciones_incidencia (incidencia_id, tecnico_id, asignado_por, fecha_asignacion, fecha_fin, activa, created_at, updated_at)
VALUES ('e7a46b24-eae5-5f7c-9b83-ec63e24860a1', (SELECT id FROM usuarios WHERE email = 'tecnico.alumbrado.demo@urbancloudai.com'), (SELECT id FROM usuarios WHERE email = 'supervisor.demo@urbancloudai.com'), now() - interval '20 days' + interval '8 hours', now() - interval '20 days' + interval '2 days', false,
        now() - interval '20 days', now() - interval '20 days');
INSERT INTO actualizaciones_incidencia (incidencia_id, usuario_id, estado_id, comentario, created_at, updated_at)
VALUES ('e7a46b24-eae5-5f7c-9b83-ec63e24860a1', (SELECT id FROM usuarios WHERE email = 'tecnico.alumbrado.demo@urbancloudai.com'), (SELECT id FROM estados_incidencia WHERE nombre = 'En atención'), 'Se inicia la atención en el lugar.',
        now() - interval '20 days' + interval '12 hours', now() - interval '20 days' + interval '12 hours');
INSERT INTO actualizaciones_incidencia (incidencia_id, usuario_id, estado_id, comentario, created_at, updated_at)
VALUES ('e7a46b24-eae5-5f7c-9b83-ec63e24860a1', (SELECT id FROM usuarios WHERE email = 'tecnico.alumbrado.demo@urbancloudai.com'), (SELECT id FROM estados_incidencia WHERE nombre = 'Atendido'), 'Trabajo concluido, se adjunta foto.',
        now() - interval '20 days' + interval '16 hours', now() - interval '20 days' + interval '16 hours');
INSERT INTO evidencias_incidencia (id, incidencia_id, usuario_id, tipo, ruta_archivo, created_at, updated_at)
VALUES ('139b0283-462b-5c71-a8a9-31c6b5018d49', 'e7a46b24-eae5-5f7c-9b83-ec63e24860a1', (SELECT id FROM usuarios WHERE email = 'tecnico.alumbrado.demo@urbancloudai.com'), 'CIERRE', 'atenciones/demo/8.jpg',
        now() - interval '20 days' + interval '16 hours', now() - interval '20 days' + interval '16 hours');
INSERT INTO notificaciones_incidencia (id, usuario_id, incidencia_id, titulo, mensaje, leida_en, created_at, updated_at)
VALUES ('0993c61d-b30b-5709-87c5-34fb189361ac', (SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'e7a46b24-eae5-5f7c-9b83-ec63e24860a1', 'Tu reporte fue registrado', 'El reporte URB-2026-0008 está en estado Revisión solicitada.',
        now(), now() - interval '20 days', now() - interval '20 days');
INSERT INTO auditorias (usuario_id, incidencia_id, accion, entidad, entidad_id, valores_nuevos, created_at)
VALUES ((SELECT id FROM usuarios WHERE email = 'ciudadano.demo@urbancloudai.com'), 'e7a46b24-eae5-5f7c-9b83-ec63e24860a1', 'reporte_creado', 'incidencias', 'e7a46b24-eae5-5f7c-9b83-ec63e24860a1', '{"codigo": "URB-2026-0008"}'::jsonb, now() - interval '20 days');

COMMIT;
