# Jenna Car con Docker

Requisitos: Docker Desktop iniciado (Windows/macOS), o Docker Engine con Compose
en Linux, y Python 3 para el asistente de inicio.

Desde la carpeta del proyecto ejecuta:

```sh
python deploy/start.py
```

En una instalacion nueva genera claves aleatorias, crea `.env.production` y
levanta MySQL, la API Flask con Gunicorn y el frontend con Nginx. Abre
http://localhost:8080. Si ya existe `.env.production`, conserva su configuracion;
usa el puerto indicado en `HTTP_PORT`.

Los datos y fotos persisten en volumenes Docker. El paquete no contiene datos
locales ni credenciales. Correo, Google y pagos requieren sus propias claves en
`.env.production`. Para desplegar en un servidor, consulta [deploy/LEEME.md](deploy/LEEME.md).

Sin Python, copia `.env.production.example` a `.env.production`, configura sus
claves y ejecuta:

```sh
docker compose --env-file .env.production -f compose.production.yml up -d --build --wait
```

Para generar el ZIP transportable:

```sh
python deploy/package.py
```

El archivo se crea en `dist-deploy/jenna-car-servidor.zip`.

Las mejoras incluyen disponibilidad por duración y mecánico, avances con fotos
y correo, seguimiento de vehículos y pagos de demostración con tarjeta o Nequi.
Consulta [las migraciones](backend/MIGRACIONES.md) y [los detalles de las mejoras](backend/MEJORAS.md).

Docker Compose ejecuta el servicio `migrate` antes de iniciar la API. Para una
base existente importada desde SQL sin versión de Alembic, utiliza primero
`python deploy/migrate_existing.py` y revisa su plan.
