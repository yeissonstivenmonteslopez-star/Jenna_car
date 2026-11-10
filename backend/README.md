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
## Correo y pagos

El correo admite `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`,
`MAIL_FROM`, `MAIL_USE_TLS` y `MAIL_USE_SSL`. Las variables anteriores
`SMTP_EMAIL` y `SMTP_PASSWORD` siguen funcionando como alternativa.
Para Gmail configura `MAIL_HOST=smtp.gmail.com`, puerto 587 y TLS, con una
contraseña de aplicación de Google. La recuperación devuelve 503 si SMTP
rechaza el envío; las notificaciones se entregan en segundo plano.

Los pagos usan Mercado Pago Checkout Pro: el cliente crea una preferencia
con `POST /api/pagos` y continúa en la URL de la pasarela. Configura las cuatro
variables `MERCADOPAGO_*` de `.env.example`, incluyendo el secreto de Webhooks
y las URLs públicas HTTPS. La URL de retorno puede ser `/mis-recibos` de tu web.
El retorno del navegador no confirma un pago: solo un webhook firmado, seguido
de una consulta a Mercado Pago que coincida en referencia, monto y moneda COP.
Los métodos disponibles dependen de la cuenta del vendedor y de la pasarela;
no se garantiza Nequi como método directo.

La integración necesita las columnas de seguimiento de la migración
`d82e6a3f4b10_add_mercado_pago.py`. Está preparada, pero no se ha aplicado
ni se ha comprobado el esquema de tu base. Antes de habilitar pagos en un
entorno configurado, aplica las migraciones siguiendo las instrucciones anteriores.
Los pagos anteriores cuya referencia comienza por `NEQUI-` conservan la etiqueta
simulada. El checkout real no crea pagos simulados; la demostración local se configura por separado.

Pruebas aisladas de correo y pagos, sin importar la aplicación ni conectar bases:

```powershell
..\.venv\Scripts\python.exe tests/test_mail_payments_isolated.py
```


### Demostración local sin pasarela

Con `PAYMENTS_SIMULATED=true` en `backend/.env`, `POST /api/pagos` registra
un pago con referencia `SIM-`, y marca su recibo como pagado en una sola
transacción. No llama a Mercado Pago, no requiere webhook ni URLs públicas,
y no depende de la migración de columnas de Mercado Pago. El frontend consulta
`GET /api/pagos/config` para mostrar avisos y el botón «Simular pago».
Los registros permanecen identificados como simulados en el historial incluso
si luego se cambia de modo. Los recibos de demostración quedan pagados dentro
de la aplicación; utiliza recibos de prueba para esta presentación.

Reinicia el backend después de cambiar `.env`. Cuando publiques el proyecto,
usa `PAYMENTS_SIMULATED=false`, aplica la migración y configura las credenciales
y URLs del checkout real indicadas arriba. El navegador no puede activar la
simulación mediante el cuerpo de una petición.
