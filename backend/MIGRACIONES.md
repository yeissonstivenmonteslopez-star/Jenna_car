# Migraciones de Jenna Car

El 12 de noviembre de 2026 se autorizaron y aplicaron las migraciones a la
instancia definida en `backend/.env`. Se inicio su servidor MySQL existente
de Laragon, sin inicializar un directorio de datos nuevo.

## Resultado comprobado

- Se inspecciono MySQL real: el esquema provenia del SQL importado y no tenia
  tabla de version de Alembic.
- Se creo un respaldo SQL completo en `.local-backups/` antes de ejecutar DDL.
  Esa carpeta esta excluida de Git, Docker y los paquetes de distribucion.
- Se valido la estructura y se registro la linea base `c91d4e7a2b60`. No se
  repitio la migracion antigua que reconstruye las tablas legadas.
- Se aplicaron `d82e6a3f4b10` (compatibilidad de los modulos existentes de pagos),
  `ef31a6c5d204` (aprobacion y envio de recibos), y `f4a8b20c6d91` (cupos activos).
- Se verificaron las cantidades de filas de todas las tablas sin cambios.
  La instancia no contenia citas, ordenes, recibos ni pagos antes de migrar.
- Ocho pruebas de integracion con MySQL real pasaron. Solo crearon y limpiaron
  sus propios registros QA; los envios SMTP y proveedores de pago se simularon.

La columna calculada `citas.cupo_activo` vale 1 para citas no canceladas y NULL
para las canceladas. Los nuevos indices unicos combinan vehiculo o mecanico,
fecha, hora y esa columna. Esto permite reservar de nuevo un horario cancelado
sin eliminar ni reescribir su registro historico. Los bloqueos de transaccion
de Flask siguen siendo necesarios para los solapamientos por duracion.

## Usar el asistente en otra base existente

Primero revisa `backend/.env`. Para ver el plan, desde la raiz:

```sh
python deploy/migrate_existing.py
```

Para respaldar y aplicar, con un mysqldump compatible instalado:

```sh
python deploy/migrate_existing.py --apply --mysqldump RUTA_A_MYSQLDUMP
```

El asistente no inicializa bases vacias y rechaza estructuras legadas o bases
sin version que no coincidan con el esquema importado conocido. No registra
una linea base a ciegas. Conserva la copia SQL en un lugar privado.

En una instalacion ya versionada se puede usar Alembic directamente desde
`backend`:

```sh
flask --app app db current
flask --app app db upgrade
```

Docker Compose de produccion ejecuta las migraciones en el servicio `migrate`
antes de iniciar el backend. Esto sirve para una base nueva o versionada. Una
base importada sin Alembic requiere primero el asistente anterior con su
conexion correcta; no se debe intentar ejecutar desde cero la cadena antigua.

## Reversion de la ultima migracion

Con una copia de seguridad verificada y desde `backend`:

```sh
flask --app app db downgrade ef31a6c5d204
```

La reversion comprueba duplicados antes de tocar indices. Si ya se reservo un
horario cancelado y los indices anteriores no pueden representar ambos
registros, se detiene sin borrar citas. En ese caso conserva el esquema nuevo
o restaura el respaldo durante una ventana de mantenimiento; no borres datos
para forzar el downgrade. MySQL confirma muchas operaciones DDL de manera
implicita: un rollback de transaccion no sustituye al respaldo.

El arranque normal de Flask no crea ni altera tablas. Solo la conexion explicita
de Alembic puede atravesar la proteccion de DDL de la aplicacion.
