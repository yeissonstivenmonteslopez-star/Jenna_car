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