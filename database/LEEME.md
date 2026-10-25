# Base de datos de UrbanCloud AI: cómo crearla

Motor: PostgreSQL 15 o superior (en producción, Supabase).

## Scripts

Ejecutar en una base vacía, en este orden:

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `01_esquema.sql` | Crea las 20 tablas, claves primarias y foráneas, restricciones e índices. |
| 2 | `02_catalogos.sql` | Carga los datos base: 5 roles, 5 áreas, 6 categorías, 3 prioridades, 8 estados, 2 distritos y 2 configuraciones. Son necesarios para que la aplicación funcione. |
| 3 | `03_datos_prueba_sinteticos.sql` | Carga las cuentas de acceso de los cinco perfiles y datos de ejemplo: 9 usuarios y 8 incidencias, una en cada estado, con su historial, asignaciones, evidencias y notificaciones. Es necesario: sin él no hay con qué iniciar sesión. |

Desde la línea de comandos:

```bash
psql "$DATABASE_URL" -f 01_esquema.sql
psql "$DATABASE_URL" -f 02_catalogos.sql
psql "$DATABASE_URL" -f 03_datos_prueba_sinteticos.sql
```

En Supabase también sirve pegar cada archivo en el SQL Editor.

## Verificación

Los tres scripts se cargaron en un esquema temporal de PostgreSQL (el de Supabase del proyecto, aislado de las tablas reales) y dieron: 20 tablas, 5 roles, 8 estados, 9 usuarios, 8 incidencias, 33 cambios de estado y 6 asignaciones. El esquema temporal se eliminó al terminar.

## Migraciones Alembic

La carpeta `alembic/` contiene las migraciones del backend:

| Revisión | Contenido |
|---|---|
| `0001_linea_base` | Punto de partida: no crea tablas (el esquema base es `01_esquema.sql`). |
| `0002_sesiones_renovacion` | Tabla `sesiones_renovacion` (sesiones revocables). |
| `0003_tokens_correo` | Tabla `tokens_correo` (verificación de correo y recuperación de contraseña). |

Estas dos tablas ya están incluidas en `01_esquema.sql`, así que en una base nueva no hace falta ejecutar Alembic. Alembic se usa para evolucionar una base ya existente (`alembic upgrade head` desde `backend`).

## Datos sintéticos

Las incidencias y los demás datos que crea `03_datos_prueba_sinteticos.sql` son ficticios y están marcados:

- Los correos de las cuentas terminan en `.demo@urbancloudai.com`, salvo el del administrador (`admin@urbancloudai.com`).
- Los títulos de las incidencias empiezan con `[Demo]`.
- Las rutas de fotos (`reportes/demo/...`) no existen en el almacenamiento, así que las imágenes no se verán.

Está pensado para una base nueva y vacía: no lo ejecutes en una base que ya tenga datos reales.

## Cuentas de prueba (solo para estos datos sintéticos)

| Rol | Correo |
|---|---|
| Ciudadano | ciudadano.demo@urbancloudai.com |
| Operador | operador.demo@urbancloudai.com |
| Supervisor | supervisor.demo@urbancloudai.com |
| Técnico, Alumbrado público | tecnico.alumbrado.demo@urbancloudai.com |
| Técnico, Mantenimiento | tecnico.mantenimiento.demo@urbancloudai.com |
| Técnico, Servicios ambientales | tecnico.ambiental.demo@urbancloudai.com |
| Técnico, Áreas verdes | tecnico.areasverdes.demo@urbancloudai.com |
| Técnico, Vías y obras | tecnico.vias.demo@urbancloudai.com |
| Administrador | admin@urbancloudai.com |
