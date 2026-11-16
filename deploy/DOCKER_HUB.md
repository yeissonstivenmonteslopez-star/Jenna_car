# Publicar Jenna Car en Docker Hub

La aplicación de producción usa dos imágenes: `jenna-car-backend:1.0` (Flask)
y `jenna-car-web:1.0` (Nginx con el frontend compilado). MySQL usa la imagen
oficial `mysql:8.0`; no necesitas publicar una imagen propia para la base de datos.

## Publicar las imágenes locales verificadas

En Docker Hub crea los repositorios `jenna-car-backend` y `jenna-car-web`,
con la visibilidad que necesites. Desde PowerShell en la raíz del proyecto,
sustituye `TU_USUARIO` por tu usuario de Docker Hub:

```powershell
docker login
docker tag jenna-car-backend:1.0 TU_USUARIO/jenna-car-backend:1.0
docker tag jenna-car-web:1.0 TU_USUARIO/jenna-car-web:1.0
docker push TU_USUARIO/jenna-car-backend:1.0
docker push TU_USUARIO/jenna-car-web:1.0
```

`docker login` abre el flujo de autenticación de Docker. No escribas contraseñas
ni tokens dentro de los Dockerfiles o del repositorio.

## Ejecutar las imágenes en otro equipo

En una copia de `compose.production.yml`, cambia las imágenes de `backend` y
`migrate` a `TU_USUARIO/jenna-car-backend:1.0`, y la de `web` a
`TU_USUARIO/jenna-car-web:1.0`. Quita los bloques `build` de esa copia para
desplegar únicamente las imágenes publicadas. Configura `.env.production`
en ese equipo con sus credenciales y dominio. Después:

```powershell
docker compose --env-file .env.production -f compose.production.yml pull
docker compose --env-file .env.production -f compose.production.yml up -d --no-build
docker compose --env-file .env.production -f compose.production.yml ps
```

El servicio `migrate` aplica las migraciones de la aplicación antes de iniciar
el backend. Haz una copia de seguridad si despliegas sobre una base existente.
Las imágenes no incluyen los datos ni las fotografías: se conservan en volúmenes
y requieren su propio respaldo o transferencia.

La configuración de Google del frontend se incorpora al construir la imagen.
Si cambias `VITE_GOOGLE_CLIENT_ID`, reconstruye y publica una nueva versión de
`web`. Configura también los orígenes autorizados de Google para el dominio final.

Para versiones posteriores usa otra etiqueta (por ejemplo `1.1`) y cambia
las referencias en Compose. Las imágenes construidas en esta revisión son
`linux/amd64`.

Referencias oficiales:
- https://docs.docker.com/docker-hub/repos/manage/hub-images/push/
- https://docs.docker.com/reference/cli/docker/login/
