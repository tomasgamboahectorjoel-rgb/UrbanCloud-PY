# UrbanCloud AI: entorno secundario en Vercel

Esta rama publica el entorno secundario de UrbanCloud AI, con la interfaz y el servidor en Vercel: <https://www.urbancloudai.site>.

| Pieza | Servicio | Directorio raíz del proyecto | Configuración |
|---|---|---|---|
| Interfaz (React) | Vercel | `frontend` | `frontend/vercel.json` |
| Servidor (FastAPI) | Vercel | `backend` | `backend/vercel.json`, `backend/app/app.py` (punto de entrada) y `backend/.python-version` (Python 3.12) |

`frontend/vercel.json` reenvía las llamadas `/api/*` al servidor de Vercel y entrega `index.html` en las demás rutas. Así la interfaz y la API comparten dominio y las cookies de sesión viajan sin CORS.

El repositorio no incluye `pyproject.toml` a propósito: Vercel exige una sección `[project]` si lo encuentra, y la configuración de las pruebas está en `backend/pytest.ini`.

## Variables del servidor

| Variable | Valor |
|---|---|
| `APP_ENV` | `production` |
| `DATABASE_URL` | Pooler transaccional de Supabase (puerto `6543`), con el prefijo `postgresql+psycopg://` y `?sslmode=require` |
| `SECRET_KEY` | Clave aleatoria de 32 caracteres o más |
| `STORAGE_BACKEND` | `s3` |
| `S3_BUCKET`, `S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` | Datos de **S3 Connection** de Supabase |
| `PUBLIC_FRONTEND_URL` | Dirección HTTPS de la interfaz: `https://www.urbancloudai.site` |
| `RESEND_API_KEY` | Opcional, para enviar correos de verificación y recuperación |
| `DOCS_ENABLED` | Opcional. En producción la documentación de la API (`/docs`) está desactivada; con `true` se publica |

En producción el servidor no arranca si no se cumplen las condiciones de seguridad: clave larga, almacenamiento S3, PostgreSQL con psycopg y HTTPS. Con el pooler transaccional se desactivan las sentencias preparadas (`prepare_threshold=None`).

Este entorno comparte la base de datos (Supabase) y el bucket de fotos con el entorno principal (<https://www.urbancloudai.online>), que usa las ramas `entorno-principal-frontend` y `entorno-principal-backend`.

## Instalación y ejecución

El código completo, la guía de instalación y ejecución, y los scripts de la base de datos están en la rama `main`.
