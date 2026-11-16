# Jenna Car: instalación completa desde Docker Hub

Este despliegue descarga frontend, backend y el respaldo privado de la base y las
fotografías. Requiere Docker con Compose, acceso a `ysml17/jenna_car` y el archivo
privado `.env.production` suministrado en el paquete de instalación.

Desde la carpeta del paquete ejecuta:

```powershell
docker login
docker compose --env-file .env.production pull
docker compose --env-file .env.production up -d --wait --wait-timeout 300
docker compose --env-file .env.production ps
```

En Windows también puedes ejecutar `powershell -ExecutionPolicy Bypass -File .\Iniciar.ps1`
después de `docker login`.

Abre `http://localhost`. Se conservan los usuarios y sus contraseñas de la
base original; no se crea una cuenta nueva automáticamente.

La primera ejecución restaura los datos solo en una base vacía. Los siguientes
arranques conservan los cambios: no vuelven a importar el respaldo. No uses
`docker compose down -v`: elimina la base y las fotografías de esta instalación.

Mantén privado este paquete: `.env.production` contiene credenciales. Ese archivo
no se incluye en la imagen publicada. El repositorio de Docker Hub que contiene
`datos-20261116` debe permanecer privado: esa imagen sí contiene información real.

Para usar un dominio cambia `FRONTEND_ORIGIN` y configura HTTPS y los orígenes
autorizados de Google. El ID de Google del frontend es el incorporado en la imagen.
Si cambias de ID, debes reconstruir la imagen web.

Si el puerto 80 ya está ocupado, cambia `HTTP_PORT` a `8080` y `FRONTEND_ORIGIN`
a `http://localhost:8080`. Autoriza también ese origen en la consola de Google.

El respaldo es una copia del 16 de noviembre de 2026; Docker Hub no sincroniza
pagos, usuarios ni fotos que se agreguen después de esa copia. Las imágenes son
`linux/amd64`. El correo usa la configuración SMTP del archivo privado.
