# UrbanCloud AI

Plataforma web para reportar y gestionar incidencias urbanas en Chimbote y Nuevo Chimbote. El ciudadano reporta con foto y ubicación, un clasificador de imágenes externo sugiere categoría, prioridad y área, y el reporte pasa por operador, supervisor y personal técnico hasta su cierre.

```text
React + Leaflet  ->  FastAPI  ->  PostgreSQL (Supabase)
                          |-- clasificador de imágenes (servicio externo)
                          |-- fotos de evidencia (Supabase Storage, compatible con S3)
                          `-- correo transaccional (Resend, opcional)
```

La sesión usa cookies `HttpOnly` (acceso de 15 minutos y renovación de 7 días, revocable) y protección CSRF en las escrituras. No se guardan tokens en `localStorage`.

## Perfiles y flujo

| Perfil | Qué hace |
|---|---|
| Ciudadano | Reporta una incidencia con foto y ubicación, consulta y sigue sus reportes y los de otros vecinos, y puede pedir la revisión de un reporte cerrado. Es el único perfil con registro público. |
| Operador | Revisa la clasificación sugerida (categoría, prioridad y área), la confirma o la corrige indicando el motivo, y deriva el reporte. Resuelve las solicitudes de revisión. |
| Supervisor | Asigna un técnico activo del área, decide qué hacer con los casos impedidos y aprueba el cierre. |
| Personal técnico | Registra su avance en campo (en camino, en atención, atendido o impedido) con un comentario y, si quiere, una foto. |
| Administrador | Crea y gestiona las cuentas internas, ajusta el umbral de confianza de la clasificación y consulta la auditoría. |

Un reporte avanza por estos estados: `En revisión`, `Derivado`, `Asignado`, `En atención`, `Atendido` y `Cerrado`. Hay dos excepciones: `Impedido` (el técnico no puede completar el trabajo; el supervisor reasigna o devuelve el caso al operador) y `Revisión solicitada` (el ciudadano pide revisar un cierre; el operador reabre el caso o mantiene el cierre). El clasificador solo sugiere: la clasificación siempre la confirma una persona.

## Requisitos

- Git.
- Python 3.12.
- Node.js 22.13 o superior y pnpm 11 (`npm install -g pnpm@11`).
- Para la base de datos, una de estas dos:
  - Una cuenta de Supabase (el plan gratuito alcanza): <https://supabase.com>.
  - Docker, para una base PostgreSQL local sin cuentas externas.
- Conexión a internet (clasificador de imágenes y mapas; también Supabase, si se usa).

## Formas de ejecutarlo

| Opción | Cuándo usarla | Dónde está |
|---|---|---|
| Base local con Docker | Es la más rápida: no necesita cuentas externas y las fotos se guardan en disco. | Sección «Ejecución local con Docker», al final |
| Supabase | Es igual al sistema desplegado: base de datos y fotos en la nube. | Pasos 1 a 5 |

## 1. Clonar el repositorio

```bash
git clone https://github.com/tomasgamboahectorjoel-rgb/UrbanCloud-PY.git
cd UrbanCloud-PY
```

## 2. Crear la base de datos en Supabase

El sistema usa PostgreSQL alojada en Supabase. Estos pasos crean una propia y cargan el esquema. Con la base local en Docker no hacen falta los pasos 2 y 3: ver «Ejecución local con Docker».

1. En Supabase, crea un proyecto nuevo. Elige una región y una contraseña para la base de datos, y anótalas: se usan más adelante.
2. Abre el **SQL Editor** del proyecto y ejecuta, uno por uno y en este orden, los archivos de la carpeta `database/`:
   1. `01_esquema.sql`: crea las 20 tablas, con sus claves, restricciones e índices, y activa la seguridad por filas (RLS) en todas, como en el sistema desplegado.
   2. `02_catalogos.sql`: carga los datos base (roles, áreas, categorías, prioridades, estados, distritos y configuración). El sistema no funciona sin ellos.
   3. `03_datos_prueba_sinteticos.sql`: carga cuentas y reportes ficticios para probar. Es opcional, pero sin él no hay con qué iniciar sesión.
3. En **Table Editor** comprueba que existen las 20 tablas.

## 3. Crear el almacenamiento de fotos

Las fotos de los reportes y de la atención técnica van a un bucket privado de Supabase Storage.

1. En **Storage**, crea un bucket llamado `evidencias`. Déjalo **privado** (sin marcar «Public bucket»).
2. En la configuración de Storage, abre **S3 Connection**. Ahí aparecen el **endpoint** y la **región**.
3. Crea una **access key** nueva. Supabase muestra el *Access key ID* y el *Secret access key*; el secreto aparece una sola vez, cópialo.

Los nombres de los menús pueden cambiar con las versiones del panel de Supabase.

## 4. Configurar el servidor

Desde la raíz del proyecto:

**Windows (PowerShell)**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

**macOS o Linux**

```bash
cd backend
python3 -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
```

Abre `backend/.env` y edita estas variables. Las demás pueden quedar como están.

| Variable | Qué poner |
|---|---|
| `DATABASE_URL` | Cadena de conexión de Supabase (ver abajo). |
| `SECRET_KEY` | Una clave propia y aleatoria, de 32 caracteres o más. |
| `STORAGE_BACKEND` | `s3` |
| `S3_BUCKET` | `evidencias` |
| `S3_ENDPOINT_URL` | El endpoint que muestra **S3 Connection**. |
| `AWS_ACCESS_KEY_ID` | El *Access key ID* del paso 3. |
| `AWS_SECRET_ACCESS_KEY` | El *Secret access key* del paso 3. |
| `AWS_DEFAULT_REGION` | La región que muestra **S3 Connection**. |
| `RESEND_API_KEY` | Opcional. Vacía, el sistema funciona y avisa que no pudo enviar los correos de verificación. |

**Cómo armar `DATABASE_URL`:** en Supabase, pulsa **Connect** y copia la cadena del **Transaction pooler**. Tiene esta forma:

```text
postgresql://postgres.<ref>:[CONTRASEÑA]@aws-0-<región>.pooler.supabase.com:6543/postgres
```

Cámbiala a este formato para el proyecto:

```text
postgresql+psycopg://postgres.<ref>:<CONTRASEÑA>@aws-0-<región>.pooler.supabase.com:6543/postgres?sslmode=require
```

- Cambia el prefijo a `postgresql+psycopg://` y añade `?sslmode=require` al final.
- Si la contraseña tiene símbolos como `@`, `#`, `/` o `:`, escríbelos codificados (`@` es `%40`, `#` es `%23`, `/` es `%2F`).
- No uses la conexión directa (`db.<ref>.supabase.co`): suele requerir IPv6 y falla en muchas redes.

No compartas el archivo `.env` ni lo subas al repositorio.

## 5. Ejecutar

Servidor (terminal 1, dentro de `backend`):

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

En macOS o Linux: `./.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`.

Interfaz (terminal 2, desde la raíz del proyecto):

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Abre <http://127.0.0.1:5173>. Vite reenvía las llamadas `/api/*` al servidor en el puerto 8000. La documentación interactiva de la API (Swagger) está en <http://127.0.0.1:8000/docs>. Las consultas `GET` se ejecutan directamente. Las escrituras (`POST`, `PATCH`, `PUT`, `DELETE`) exigen el token CSRF: ejecuta primero `GET /sesion/csrf`, copia el valor de `token`, pulsa **Authorize**, pégalo y confirma. Después ya puedes iniciar sesión y ejecutar el resto.

Mantén las dos terminales abiertas mientras uses el sistema.

## 6. Cuentas de prueba

El script `03_datos_prueba_sinteticos.sql` crea 10 cuentas ficticias (una por perfil, un segundo ciudadano y un técnico por cada área) y 8 reportes de ejemplo en distintos estados. Las contraseñas de esas cuentas no se publican en el repositorio.

| Perfil | Correo |
|---|---|
| Ciudadano | `ciudadano.demo@urbancloudai.com` y `ciudadano2.demo@urbancloudai.com` |
| Operador | `operador.demo@urbancloudai.com` |
| Supervisor | `supervisor.demo@urbancloudai.com` |
| Personal técnico (una cuenta por área) | `tecnico.alumbrado.demo@`, `tecnico.mantenimiento.demo@`, `tecnico.ambiental.demo@`, `tecnico.areasverdes.demo@` y `tecnico.vias.demo@`, todas con el dominio `urbancloudai.com` |
| Administrador | `admin.demo@urbancloudai.com` |

También se puede crear una cuenta de ciudadano desde `/registro`. Las cuentas internas las crea el administrador.

Para comprobar que el servidor está conectado a la base, inicia sesión con cualquier cuenta: si entra al panel, la conexión funciona. Que `/health` responda no prueba la base.

Los reportes de ejemplo no tienen fotos reales, así que sus imágenes no se ven. Los reportes nuevos sí guardan su foto.

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| El inicio de sesión tarda y falla con error 500 | `DATABASE_URL` incorrecta (usuario, contraseña, región o puerto) o proyecto de Supabase pausado. Los proyectos gratuitos se pausan tras un tiempo sin uso; se reactivan desde el panel. |
| «relation … does not exist» | Los scripts de `database/` no se ejecutaron en ese proyecto. |
| Las credenciales no son válidas | No se ejecutó `03_datos_prueba_sinteticos.sql`, o el correo está mal escrito. |
| Al crear un reporte la foto falla | Variables `S3_*` o `AWS_*` incorrectas, o el bucket `evidencias` no existe. |
| El reporte falla con error 503 | El clasificador de imágenes no responde; revisa la conexión a internet. |

## Pruebas

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest

cd ..\frontend
pnpm test
```

Las 23 pruebas del servidor usan una base SQLite temporal y simulan el clasificador, así que no tocan Supabase. Las 110 de la interfaz corren con Vitest.

## Estructura

- `backend/`: servidor FastAPI (`app/api`, `app/servicios`, `app/modelos`, `app/seguridad`, `app/configuracion`), migraciones en `alembic/` y pruebas en `tests/`.
- `frontend/`: interfaz React (`src/paginas` por rol, `src/componentes`, `src/servicios`).
- `database/`: scripts SQL para crear la base (`01_esquema.sql`, `02_catalogos.sql` y `03_datos_prueba_sinteticos.sql`) y `cargar_base.py`.
- `docker-compose.yml`: PostgreSQL local con esos scripts ya cargados.

Las migraciones de Alembic sirven para evolucionar una base que ya existía; una base creada con `database/` ya incluye todas las tablas.

## Despliegue en la nube

El sistema está publicado con tres servicios:

| Pieza | Servicio | Configuración en el repositorio |
|---|---|---|
| Base de datos y fotos | Supabase (PostgreSQL y bucket privado `evidencias`) | `database/` |
| Servidor (FastAPI) | Railway, con Docker | `backend/Dockerfile` y `backend/railway.json` (ruta de salud `/health`) |
| Servidor (alternativa) | Vercel | `backend/vercel.json`, `backend/app/app.py` y `backend/.python-version` |
| Interfaz (React) | Vercel | `frontend/vercel.json` |

Hay dos entornos que comparten la misma base de datos y el mismo bucket: el principal (<https://www.urbancloudai.online>, interfaz en Vercel y servidor en Railway) y el secundario (<https://www.urbancloudai.site>, interfaz y servidor en Vercel).

`frontend/vercel.json` reenvía las llamadas `/api/*` al servidor. Así la interfaz y la API comparten dominio y las cookies de sesión viajan sin CORS. Para desplegar con otro servidor, cambia la dirección de destino de esa regla.

Variables del servidor en producción:

| Variable | Valor |
|---|---|
| `APP_ENV` | `production` |
| `DATABASE_URL` | Pooler transaccional de Supabase (puerto `6543`), con `postgresql+psycopg://` y `?sslmode=require` |
| `SECRET_KEY` | Clave aleatoria de 32 caracteres o más |
| `STORAGE_BACKEND` | `s3` |
| `S3_BUCKET`, `S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` | Datos de **S3 Connection** de Supabase |
| `PUBLIC_FRONTEND_URL` | Dirección HTTPS de la interfaz de ese entorno |
| `RESEND_API_KEY` | Opcional, para enviar correos |
| `DOCS_ENABLED` | Opcional. En producción la documentación de la API (`/docs`) está desactivada; con `true` se publica |

El servidor no arranca en producción si no se cumplen las condiciones de seguridad (clave larga, almacenamiento S3, PostgreSQL con psycopg y HTTPS). Con el pooler transaccional se desactivan las sentencias preparadas (`prepare_threshold=None`).

## Ejecución local con Docker

Esta opción no necesita Supabase: la base corre en un contenedor de PostgreSQL 17 y las fotos se guardan en `backend/storage`.

1. Desde la raíz del proyecto, levantar la base. La primera vez carga `database/01_esquema.sql`, `02_catalogos.sql` y `03_datos_prueba_sinteticos.sql`:

```bash
docker compose up -d
```

2. Preparar y ejecutar el servidor y la interfaz como en los pasos 4 y 5, pero sin editar las variables de la tabla: los valores de `backend/.env.example` ya apuntan a esa base (`DATABASE_URL` en `localhost:5432` y `STORAGE_BACKEND=local`). Conviene cambiar solo `SECRET_KEY` por una clave propia.

3. Para detener la base: `docker compose down`. Los datos se conservan; con `docker compose down -v` se borran.

Con una instalación propia de PostgreSQL, `python database/cargar_base.py` (con el entorno virtual del backend activo) crea la base y carga los tres scripts usando `DATABASE_URL`. Se detiene si la base ya tiene tablas.
