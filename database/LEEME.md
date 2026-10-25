# Base de datos de UrbanCloud AI: cómo crearla

Motor: PostgreSQL 15 o superior (en producción, Supabase).

## Scripts

Ejecutar en una base vacía, en este orden:

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `01_esquema.sql` | Crea las 20 tablas, claves primarias y foráneas, restricciones e índices. |
| 2 | `02_catalogos.sql` | Carga los datos base: 5 roles, 5 áreas, 6 categorías, 3 prioridades, 8 estados, 2 distritos y 2 configuraciones. Son necesarios para que la aplicación funcione. |
| 3 | `03_datos_prueba_sinteticos.sql` | Carga datos **ficticios** para probar: 10 usuarios y 8 incidencias, una en cada estado, con su historial, asignaciones, evidencias y notificaciones. Opcional. |

Desde la línea de comandos:

```bash
psql "$DATABASE_URL" -f 01_esquema.sql
psql "$DATABASE_URL" -f 02_catalogos.sql
psql "$DATABASE_URL" -f 03_datos_prueba_sinteticos.sql
```

En Supabase también sirve pegar cada archivo en el SQL Editor.

## Verificación

Los tres scripts se cargaron en un esquema temporal de PostgreSQL (el de Supabase del proyecto, aislado de las tablas reales) y dieron: 20 tablas, 5 roles, 8 estados, 10 usuarios, 8 incidencias, 33 cambios de estado y 6 asignaciones. El esquema temporal se eliminó al terminar.

## Migraciones Alembic

La carpeta `alembic/` contiene las migraciones del backend:

| Revisión | Contenido |
|---|---|
| `0001_linea_base` | Punto de partida: no crea tablas (el esquema base es `01_esquema.sql`). |
| `0002_sesiones_renovacion` | Tabla `sesiones_renovacion` (sesiones revocables). |
| `0003_tokens_correo` | Tabla `tokens_correo` (verificación de correo y recuperación de contraseña). |

Estas dos tablas ya están incluidas en `01_esquema.sql`, así que en una base nueva no hace falta ejecutar Alembic. Alembic se usa para evolucionar una base ya existente (`alembic upgrade head` desde `backend`).

## Datos sintéticos

Todo lo que crea `03_datos_prueba_sinteticos.sql` es ficticio y está marcado:

- Los correos terminan en `.demo@urbancloudai.com`.
- Los títulos de las incidencias empiezan con `[Demo]`.
- Las rutas de fotos (`reportes/demo/...`) no existen en el almacenamiento, así que las imágenes no se verán.

No ejecutarlo en una base con datos reales.

## Cuentas de prueba (solo para estos datos sintéticos)

| Rol | Correo |
|---|---|
| Ciudadano | ciudadano.demo@urbancloudai.com |
| Ciudadano | ciudadano2.demo@urbancloudai.com |
| Operador | operador.demo@urbancloudai.com |
| Supervisor | supervisor.demo@urbancloudai.com |
| Técnico, Alumbrado público | tecnico.alumbrado.demo@urbancloudai.com |
| Técnico, Mantenimiento | tecnico.mantenimiento.demo@urbancloudai.com |
| Técnico, Servicios ambientales | tecnico.ambiental.demo@urbancloudai.com |
| Técnico, Áreas verdes | tecnico.areasverdes.demo@urbancloudai.com |
| Técnico, Vías y obras | tecnico.vias.demo@urbancloudai.com |
| Administrador | admin@urbancloudai.com |

Las contraseñas no se publican: en el script solo aparece su hash bcrypt. Las nueve cuentas de los perfiles usan las contraseñas de las cuentas de demostración del sistema desplegado. La excepción es `ciudadano2.demo@urbancloudai.com`, que usa una contraseña ficticia, solo válida en una base local creada con estos scripts: `Local#Demo2026`.
