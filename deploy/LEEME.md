# Desplegar Jenna Car en un servidor Linux

Este paquete incluye el codigo actual del frontend y backend, MySQL y la configuracion de produccion. No incluye contrasenas, datos de tu base local ni fotos existentes. La app movil no forma parte de este despliegue web.

Requisitos: servidor Linux con Docker Engine y Docker Compose v2. Abre el puerto elegido (80 por defecto).

Validacion local del paquete: las imagenes de web y backend se construyeron correctamente y se iniciaron con Docker Compose. MySQL y backend pasaron sus comprobaciones de salud. El servidor Linux tambien puede construir directamente con las instrucciones siguientes.

## Iniciar

Descomprime el ZIP y entra en su carpeta. Ejecuta:

```sh
cp .env.production.example .env.production
```

Edita `.env.production`: reemplaza las tres claves, configura FRONTEND_ORIGIN con `http://IP_DEL_SERVIDOR` o tu dominio, y completa las credenciales de correo, Google y pagos que utilices. Para las claves de base de datos utiliza solo letras y numeros, porque la app construye una URL con ellas. Puedes generar cada clave con `openssl rand -hex 32`.

```sh
docker compose --env-file .env.production -f compose.production.yml up -d --build
docker compose --env-file .env.production -f compose.production.yml ps
```

Abre `http://IP_DEL_SERVIDOR`. El frontend y la API comparten origen; la base de datos solo es accesible dentro de Docker. La primera construccion descarga las dependencias y necesita internet. Configura HTTPS con el proxy de tu servidor y un certificado antes de habilitar accesos y pagos reales. Usa ese dominio HTTPS en FRONTEND_ORIGIN y en las URLs de retorno y webhooks.

El ID de Google del frontend se incorpora durante la construccion; si lo cambias debes reconstruir web. Autoriza tambien tu dominio en la consola de Google.

## Logs y reinicio

```sh
docker compose --env-file .env.production -f compose.production.yml logs --tail=100 backend
docker compose --env-file .env.production -f compose.production.yml restart
docker compose --env-file .env.production -f compose.production.yml down
```

MySQL y las fotos persisten en volumenes Docker. No ejecutes `down -v` si quieres conservarlos. Este despliegue crea una base nueva; para trasladar tu informacion actual debes exportarla e importarla por separado. Antes de actualizar una base existente, realiza una copia y revisa las migraciones en `backend/migrations`.

## Transferir imagenes ya construidas (opcional)

En el equipo con Docker funcionando:

```sh
docker compose --env-file .env.production -f compose.production.yml build
docker save -o jenna-car-imagenes.tar jenna-car-backend:1.0 jenna-car-web:1.0
```

Sube el TAR junto con este paquete. En el servidor:

```sh
docker load -i jenna-car-imagenes.tar
docker compose --env-file .env.production -f compose.production.yml up -d --no-build
```

Construye las imagenes para la arquitectura del servidor; Docker Desktop normalmente utiliza linux/amd64. MySQL se descarga por separado en el servidor.
