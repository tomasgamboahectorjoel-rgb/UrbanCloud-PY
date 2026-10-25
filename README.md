# UrbanCloud AI: servidor del entorno principal

Esta rama publica el servidor (FastAPI) del entorno principal de UrbanCloud AI en Railway. Lo consume la interfaz publicada en <https://www.urbancloudai.online>.

| Dato | Valor |
|---|---|
| Servicio | Railway, con Docker |
| Directorio raíz del proyecto | `backend` |
| Construcción | `backend/Dockerfile` y `backend/railway.json` |
| Ruta de salud | `/health` |

## Variables del servidor

| Variable | Valor |
|---|---|
| `APP_ENV` | `production` |
| `DATABASE_URL` | Pooler transaccional de Supabase (puerto `6543`), con el prefijo `postgresql+psycopg://` y `?sslmode=require` |
| `SECRET_KEY` | Clave aleatoria de 32 caracteres o más |
| `STORAGE_BACKEND` | `s3` |
| `S3_BUCKET`, `S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` | Datos de **S3 Connection** de Supabase |
| `PUBLIC_FRONTEND_URL` | Dirección HTTPS de la interfaz: `https://www.urbancloudai.online` |
| `RESEND_API_KEY` | Opcional, para enviar correos de verificación y recuperación |

En producción el servidor no arranca si no se cumplen las condiciones de seguridad: clave larga, almacenamiento S3, PostgreSQL con psycopg y HTTPS. Con el pooler transaccional se desactivan las sentencias preparadas (`prepare_threshold=None`). La documentación de la API (`/docs`) está desactivada en producción.

Este entorno comparte la base de datos (Supabase) y el bucket de fotos con el entorno secundario, que está en la rama `entorno-respaldo-vercel` (<https://www.urbancloudai.site>).

## Instalación y ejecución

El código completo, la guía de instalación y ejecución, y los scripts de la base de datos están en la rama `main`.
