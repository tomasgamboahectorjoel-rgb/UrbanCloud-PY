# UrbanCloudAI-PY


## Arquitectura

```text
React / Leaflet → FastAPI → PostgreSQL
                       ├─ clasificador de IA externo
                       └─ almacenamiento privado local (desarrollo) o S3 (producción)
```

El backend conserva rutas y formas de respuesta que consume React. La diferencia deliberada es la autenticación: cookies `HttpOnly` de acceso (15 min) y renovación (7 días), sesiones revocables en PostgreSQL y CSRF para escrituras. No se guardan tokens en `localStorage`.

## Requisitos

- Python 3.12+.
- PostgreSQL con el esquema original de UrbanCloud AI (`urbancloud_ai.sql`, del proyecto original en Laravel). Las tablas `sesiones_renovacion` y `tokens_correo` las crean las migraciones de Alembic.
- Node.js compatible con Vite 8 y pnpm 11.
- Acceso a la API real `https://clasificador-incidencias-urbanas.vercel.app/api/clasificar`.

## Backend local (PowerShell)

Los comandos parten de la raíz del repositorio.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

`backend/.env` contiene la conexión PostgreSQL, los parámetros de IA y una clave propia para FastAPI. Está ignorado por Git y se crea a partir de `.env.example`, que lista todas las variables, incluidos los ajustes opcionales del grupo de conexiones (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW` y `DB_POOL_TIMEOUT`). Las tablas adicionales `sesiones_renovacion` y `tokens_correo` se crean con las migraciones de Alembic hasta `0003_tokens_correo` (`alembic upgrade head`, desde `backend/`). El código no crea tablas automáticamente. No usar la base real para tests automatizados.

Para verificar correos y recuperar contraseñas, coloca tu clave de Resend en `backend/.env` como `RESEND_API_KEY=...`. La variable ya está creada y vacía; no pegues la clave en el frontend ni en Git. El remitente configurado es `UrbanCloud AI <verificacion@correo.urbancloudai.site>`. En local, `PUBLIC_FRONTEND_URL=http://127.0.0.1:5173` abre los enlaces en Vite. En producción configura esas mismas variables en el backend desplegado y usa la dirección HTTPS de la interfaz de cada entorno: `PUBLIC_FRONTEND_URL=https://www.urbancloudai.online` en el principal y `https://www.urbancloudai.site` en el secundario. Si no hay clave o el proveedor falla, el registro sigue funcionando y avisa que el correo no pudo enviarse.

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API: `http://127.0.0.1:8000/docs` y `http://127.0.0.1:8000/openapi.json` en desarrollo. `/health` verifica que el proceso responde; no garantiza conectividad a PostgreSQL ni a la IA.

## Frontend local

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Vite envía `/api/*` a `http://127.0.0.1:8000` y elimina el prefijo `/api`. Puede definirse `FASTAPI_URL` para cambiar el destino local. El frontend usa `VITE_API_URL` cuando la API está en otro origen. Los estilos, rutas de pantalla y Leaflet/OpenStreetMap provienen del frontend original.

## Pruebas

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest

cd ..\frontend
pnpm test
pnpm build
pnpm audit
```

`pytest` crea SQLite temporal por prueba y sustituye la IA externa por mocks. No llama a PostgreSQL real ni a la IA real. Antes de uso real se necesita una prueba manual de cada rol con una PostgreSQL **de staging**, almacenamiento privado y una llamada controlada a la IA real.

## Despliegue

Hay dos entornos independientes que comparten la misma base PostgreSQL de Supabase y el mismo almacenamiento S3:

- **Principal:** interfaz en Vercel (rama `entorno-principal-frontend`, directorio raíz `frontend`) y servidor en Railway (rama `entorno-principal-backend`, directorio raíz `backend`), construido con `backend/Dockerfile` y `backend/railway.json`, que define `/health` como ruta de salud. Dominio: `https://www.urbancloudai.online`.
- **Secundario:** interfaz y servidor en Vercel (rama `entorno-respaldo-vercel`). El servidor usa `backend/app/app.py` como punto de entrada y `backend/.python-version` para fijar Python 3.12. Dominio: `https://www.urbancloudai.site`.

`frontend/vercel.json` reenvía `/api/*` al servidor de cada entorno (Railway en el principal, Vercel en el secundario), de modo que interfaz y API comparten dominio y las cookies de sesión viajan sin CORS.

Variables del servidor en producción: `APP_ENV=production`, `DATABASE_URL` (pooler transaccional de Supabase, puerto `6543`, con `?sslmode=require`), `SECRET_KEY` de al menos 32 caracteres, `STORAGE_BACKEND=s3`, `S3_BUCKET`, `S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `ANALISIS_IA_URL` y `PUBLIC_FRONTEND_URL` con HTTPS. El servidor no arranca en producción si alguna de esas condiciones de seguridad falla. Con el pooler transaccional se desactivan las sentencias preparadas (`prepare_threshold=None`).

El repositorio no incluye `pyproject.toml` a propósito: Vercel exige una sección `[project]` si lo encuentra, y la configuración de pruebas está en `pytest.ini`.

## Comportamiento conservado

- Registro público solo Ciudadano; usuarios internos solo Administración.
- El registro ciudadano admite correos completos de cualquier dominio con sintaxis válida; la propiedad del buzón se confirma por enlace. Solo un ciudadano con correo verificado puede recuperar automáticamente una contraseña olvidada. Ciudadanos y administradores pueden cambiar su propia clave; el administrador puede restablecer la del personal interno.
- Reportes con imagen JPG/PNG de hasta 3 MiB; avances técnicos permiten también WebP y hasta 5 MiB.
- Clasificador externo recibe base64 puro, título y descripción; IA inválida no crea incidencia ni código.
- Estados, asignaciones, historial, revisión solicitada, notificaciones y auditoría.
- Evidencias se sirven por API tras verificar rol y pertenencia; nunca se exponen directamente.
- Mapa Leaflet/OpenStreetMap, geolocalización opcional y selección manual conservados.
