# UrbanCloud AI: interfaz del entorno principal

Esta rama publica la interfaz web (React) del entorno principal de UrbanCloud AI en Vercel: <https://www.urbancloudai.online>.

| Dato | Valor |
|---|---|
| Servicio | Vercel |
| Directorio raíz del proyecto | `frontend` |
| Servidor al que se conecta | Railway, rama `entorno-principal-backend` |

`frontend/vercel.json` reenvía las llamadas `/api/*` al servidor de Railway y entrega `index.html` en las demás rutas. Así la interfaz y la API comparten dominio y las cookies de sesión viajan sin CORS. Para usar otro servidor basta con cambiar la dirección de destino de esa regla.

No requiere variables de entorno en Vercel: llama a la API por la ruta relativa `/api`.

Este entorno comparte la base de datos (Supabase) y el bucket de fotos con el entorno secundario, que está en la rama `entorno-respaldo-vercel` (<https://www.urbancloudai.site>).

## Instalación y ejecución

El código completo, la guía de instalación y ejecución, y los scripts de la base de datos están en la rama `main`.
