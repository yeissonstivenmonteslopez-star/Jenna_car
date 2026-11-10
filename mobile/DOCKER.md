# API y MySQL con Docker

Desde la raíz del repositorio, con Docker Desktop ejecutándose:

```powershell
docker compose --env-file .env.docker -f compose.mobile.yml up -d --build
docker compose --env-file .env.docker -f compose.mobile.yml ps
```

`.env.docker` contiene las claves locales; no lo publiques. Este entorno usa una base nueva, independiente de Laragon, y crea las tablas declaradas por los modelos al primer arranque. No importa datos de Laragon ni ejecuta migraciones sobre su base. No contiene cuentas de ejemplo; crea tu cuenta mediante registro. Google y pagos requieren configuración adicional.

La web está en `http://localhost:8080` (desde otro dispositivo: `http://IP_DEL_PC:8080`). Comparte la API y MySQL con la app móvil. `WEB_PORT` permite cambiar el puerto web; `VITE_GOOGLE_CLIENT_ID` se incorpora al construir la imagen.

La app usa `EXPO_PUBLIC_API_URL=http://192.168.1.11:5000` en `mobile/.env`. Si cambia la IP Wi-Fi del PC, actualiza ese valor y reinicia Expo con `npx expo start --clear`. El móvil debe estar en la misma red y el firewall debe permitir el puerto 5000. MySQL solo es accesible dentro de la red Docker.

Inicia Expo desde `mobile/` con `npm start`. Para verificar Flask, abre `http://localhost:5000/api/health` o la misma ruta usando la IP del PC desde el teléfono.

Logs y parada:

```powershell
docker compose --env-file .env.docker -f compose.mobile.yml logs --tail 80 backend
docker compose --env-file .env.docker -f compose.mobile.yml down
```

`down` conserva los volúmenes. No añadas `-v`: borraría los datos. Para actualizar el código, vuelve a ejecutar `up -d --build`. No cambies las claves de MySQL esperando que actualicen usuarios en un volumen ya inicializado.

## Ejecutar en otro equipo o servidor

Instala Docker con Compose v2 (Docker Desktop en Windows/macOS o Docker Engine con Compose en Linux). Clona el repositorio:

```sh
git clone https://github.com/yeissonstivenmonteslopez-star/Jenna_car.git
cd Jenna_car
cp .env.docker.example .env.docker
```

En PowerShell usa `Copy-Item .env.docker.example .env.docker`. Edita las tres claves con valores aleatorios distintos antes de arrancar (puedes generar cada uno con `openssl rand -hex 32` en Linux). No subas `.env.docker` al repositorio.

```sh
docker compose --env-file .env.docker -f compose.mobile.yml up -d --build
```

Abre `http://IP_DEL_NUEVO_EQUIPO:8080` y cambia la URL de la app móvil a `http://IP_DEL_NUEVO_EQUIPO:5000`. Para acceso público usa un dominio con HTTPS y un proxy que termine TLS; la app móvil puede apuntar al mismo dominio que la web porque Nginx reenvía `/api/` a Flask. Configura también el dominio autorizado de Google y las URLs de correo/pagos que correspondan. Este entorno local no incluye credenciales SMTP, Google ni Mercado Pago.

Clonar el repositorio y construir imágenes NO copia los datos. En el nuevo host se crea una base vacía. Para conservar usuarios, vehículos y fotos hay que trasladar una copia de MySQL y de ambos volúmenes de archivos, restaurarla y comprobarla antes de cambiar de servidor. No copies el directorio interno de MySQL mientras está en uso.
