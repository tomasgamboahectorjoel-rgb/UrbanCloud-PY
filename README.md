# UrbanCloud AI

Este repositorio contiene UrbanCloud AI, una aplicación web para reportar problemas urbanos con una fotografía y clasificarlos con inteligencia artificial.

La rama `main` no es el código oficial. Es una copia de trabajo que no se publica en ningún servicio. El código que está en producción vive en tres ramas de entorno, y es ahí donde hay que mirar.

## Ramas de entorno

| Rama | Qué se publica desde ella | Dónde |
| --- | --- | --- |
| `entorno-principal-frontend` | La interfaz web del entorno principal (carpeta `frontend`) | Vercel, `https://www.urbancloudai.online` |
| `entorno-principal-backend` | El servidor del entorno principal (carpeta `backend`, con Docker) | Railway |
| `entorno-respaldo-vercel` | La interfaz y el servidor del entorno secundario | Vercel, `https://www.urbancloudai.site` |

Las tres ramas tienen el mismo código y solo cambian en uno o dos archivos de configuración, como `frontend/vercel.json`. Cada servicio publica de su rama la carpeta que le corresponde. Los dos entornos comparten la misma base de datos y el mismo almacenamiento de fotos. Cuando se sube un cambio a una de estas ramas, el servicio que la sigue publica la nueva versión por su cuenta.

## Otras ramas y etiquetas

Las ramas `mejora/...` guardan el trabajo previo, separado por temas, y no se publican. Las etiquetas `estado-antes-...` marcan cómo estaba el código antes de cada cambio, por si hay que volver atrás.

## Cómo ejecutar el código

El README técnico, con los requisitos, la ejecución local, las pruebas y el despliegue, está en las tres ramas de entorno. Para leerlo, abre cualquiera de ellas.
