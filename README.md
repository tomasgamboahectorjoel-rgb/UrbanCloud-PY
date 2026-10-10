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
- PostgreSQL con el esquema de `database/urbancloud_ai.sql` del proyecto original (consultar `MIGRACION_LARAVEL_A_FASTAPI.md` antes de importar o migrar).
- Node.js compatible con Vite 8 y pnpm 11.
- Acceso a la API real `https://clasificador-incidencias-urbanas.vercel.app/api/clasificar`.

## Backend local (PowerShell)

```powershell
cd D:\laragon\www\UrbanCloudAI-PY\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

En esta copia de trabajo, `backend/.env` ya contiene la conexión PostgreSQL y los parámetros de IA trasladados del Laravel original, además de una clave nueva para FastAPI. Está ignorado por Git y no debe reemplazarse con `.env.example`. La base PostgreSQL compartida ya recibió las migraciones hasta `0003_tokens_correo`; las únicas tablas adicionales son `sesiones_renovacion` y `tokens_correo`. No vuelvas a aplicar el procedimiento inicial de migración. El código no crea tablas automáticamente. No usar la base real para tests automatizados.

Para verificar correos y recuperar contraseñas, coloca tu clave de Resend en `backend/.env` como `RESEND_API_KEY=...`. La variable ya está creada y vacía; no pegues la clave en el frontend ni en Git. El remitente configurado es `UrbanCloud AI <verificacion@correo.urbancloudai.site>`. En local, `PUBLIC_FRONTEND_URL=http://127.0.0.1:5173` abre los enlaces en Vite. En producción configura esas mismas variables en el backend desplegado y usa `PUBLIC_FRONTEND_URL=https://www.urbancloudai.site`; en el despliegue de respaldo usa la URL correspondiente de `urbancloudai.online`. Si no hay clave o el proveedor falla, el registro sigue funcionando y avisa que el correo no pudo enviarse.

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API: `http://127.0.0.1:8000/docs` y `http://127.0.0.1:8000/openapi.json` en desarrollo. `/health` verifica que el proceso responde; no garantiza conectividad a PostgreSQL ni a la IA.

## Frontend local

```powershell
cd D:\laragon\www\UrbanCloudAI-PY\frontend
pnpm install --frozen-lockfile
pnpm dev
```

Vite envía `/api/*` a `http://127.0.0.1:8000` y elimina el prefijo `/api`. Puede definirse `FASTAPI_URL` para cambiar el destino local. El frontend usa `VITE_API_URL` cuando la API está en otro origen. Los estilos, rutas de pantalla y Leaflet/OpenStreetMap provienen del frontend original.

## Pruebas

```powershell
cd D:\laragon\www\UrbanCloudAI-PY\backend
.\.venv\Scripts\python.exe -m pytest

cd ..\frontend
pnpm test
pnpm build
pnpm audit
```

`pytest` crea SQLite temporal por prueba y sustituye la IA externa por mocks. No llama a PostgreSQL real ni a la IA real. Antes de uso real se necesita una prueba manual de cada rol con una PostgreSQL **de staging**, almacenamiento privado y una llamada controlada a la IA real.

## Comportamiento conservado

- Registro público solo Ciudadano; usuarios internos solo Administración.
- El registro ciudadano admite correos completos de cualquier dominio con sintaxis válida; la propiedad del buzón se confirma por enlace. Solo un ciudadano con correo verificado puede recuperar automáticamente una contraseña olvidada. Ciudadanos y administradores pueden cambiar su propia clave; el administrador puede restablecer la del personal interno.
- Reportes con imagen JPG/PNG de hasta 3 MiB; avances técnicos permiten también WebP y hasta 5 MiB.
- Clasificador externo recibe base64 puro, título y descripción; IA inválida no crea incidencia ni código.
- Estados, asignaciones, historial, revisión solicitada, notificaciones y auditoría.
- Evidencias se sirven por API tras verificar rol y pertenencia; nunca se exponen directamente.
- Mapa Leaflet/OpenStreetMap, geolocalización opcional y selección manual conservados.

Ver `DESPLIEGUE.md` para Vercel y la futura opción Cloud Run.
