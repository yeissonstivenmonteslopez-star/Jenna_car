# Backend

API Flask de Jenna Car.

## Estructura

- `app/`: codigo de la aplicacion, modelos, controladores, servicios y utilidades.
- `migrations/`: migraciones administradas por Flask-Migrate.
- `tests/`: pruebas automatizadas del backend.
- `database/`: scripts y diagramas de la base de datos.
- `scripts/`: tareas auxiliares que no forman parte de la API.
- `uploads/`: archivos generados en runtime, ignorados por Git.
- `run.py`: punto de entrada de desarrollo y Docker.

## Ejecucion local

Desde esta carpeta:

```powershell
python run.py
```

Para ejecutar las pruebas:

```powershell
python -m pytest tests
```

Las migraciones se ejecutan con Flask-Migrate usando `migrations/` como directorio de trabajo:

```powershell
flask --app run.py db upgrade
```

## Alinear la base de datos

`database/Jenna_car.bd1.sql` es el esquema de referencia actual. Para una base creada con la migración inicial antigua, ejecuta `flask --app run.py db upgrade` para trasladar los datos y normalizar las tablas.

Si importaste directamente el SQL actual en una base vacía, no ejecutes la migración inicial sobre esas tablas. Registra el esquema como actualizado una sola vez con:

```powershell
flask --app run.py db stamp head
```

Después de cualquiera de esos casos, `db upgrade` aplica las migraciones futuras.