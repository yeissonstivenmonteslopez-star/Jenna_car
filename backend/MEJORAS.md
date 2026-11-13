# Mejoras de citas, reparaciones y pagos simulados

La primera implementacion utilizo el esquema existente sin modificarlo. El
usuario autorizo posteriormente las migraciones el 12 de noviembre de 2026.
Se inspecciono MySQL real, se respaldo y se aplicaron los cambios descritos en
[MIGRACIONES.md](MIGRACIONES.md). La version actual es `f4a8b20c6d91`.
El arranque normal de Flask no modifica el esquema; Alembic usa una conexion
explicita separada para migrar.

## Verificacion del esquema

Desde la raiz del proyecto:

```sh
python backend/scripts/inspect_schema_readonly.py
```

Este comando solo consulta metadatos; no importa ni arranca Flask y no imprime
credenciales. Los campos de aprobacion/envio de recibos y de compatibilidad de
Mercado Pago que faltaban en el SQL importado ya se agregaron con las revisiones
existentes. La simulacion utiliza solamente columnas originales de `pagos`.

## Citas

- GET `/api/citas/disponibilidad?fecha=YYYY-MM-DD&servicio_id=ID&vehiculo_id=ID`
  devuelve todos los horarios, con `hora` y `disponible`. Acepta `mecanico_id`.
- Se usan las duraciones actuales de `servicios.duracion_estimada` en minutos;
  cuando no hay estimacion se reserva una hora. Horario: 08:00 a 19:00, inicios
  cada hora. Se rechazan inicios pasados y servicios que terminen tras el cierre.
- Se comprueban solapamientos del vehiculo, mecanico y capacidad. Los mecanicos
  activos representan la capacidad; sin mecanicos registrados se permite un
  cupo sin asignar. Las citas antiguas sin asignacion consumen capacidad.
- Las escrituras de citas toman un bloqueo InnoDB de una fila existente de
  usuarios y consultan citas con SELECT FOR UPDATE. El bloqueo serializa las
  reservas entre procesos hasta commit/rollback, incluso con agenda vacia.
  Esto prioriza consistencia; no requiere indices nuevos ni mutex de Python.
- La migracion `f4a8b20c6d91` agrega una columna generada y reemplaza los
  indices unicos para excluir las citas canceladas. Ahora se puede volver a
  reservar el mismo vehiculo, mecanico, fecha y hora sin borrar la cita anterior.
  El codigo conserva una comprobacion compatible para bases aun no migradas.
- Estas garantias abarcan las escrituras de la aplicacion; un cliente SQL
  externo que ignore el protocolo de bloqueo puede producir conflictos.

## Avances y seguimiento

POST `/api/mechanic/works/ID/updates` acepta JSON o multipart con `estado`,
`observaciones` y varios `files`. El mecanico debe ser propietario del trabajo.
Los estados se conservan: pendiente, en_proceso, completado y cancelado.
Las observaciones actuales se guardan en `diagnosticos.observaciones`.
Las fotos y sus descripciones/fechas se guardan en `imagenes_trabajo`.
El conjunto de fotos debe caber en el limite HTTP de 5 MB (la interfaz limita
los archivos a 4 MB en total); cada foto tiene un maximo de 4 MB. Se verifica
el contenido JPG/PNG/WEBP, se recodifica y se eliminan metadatos.

La publicacion guarda el estado, las observaciones, las fotos y una notificacion
en una transaccion. Solo despues del commit intenta entregar el correo por
SMTP. Un fallo de correo conserva la publicacion. La notificacion existente
usa `tipo` (VARCHAR) para distinguir correo pendiente/enviado, sin columnas
nuevas. POST `/api/mechanic/updates/ID/retry-email` reintenta el envio; los
reintentos simultaneos se serializan y los envios marcados se omiten. Un fallo
del proceso justo despues de la aceptacion SMTP y antes del commit puede
ocasionar un duplicado al reintentar: SMTP no permite garantizar exactamente
una entrega en ese escenario. La interfaz informa aceptacion SMTP, no lectura
ni llegada garantizada a la bandeja de entrada.

Se utilizan las variables MAIL_* existentes. El correo contiene observaciones,
placa, estado, fecha y enlace a la seccion autenticada de fotografias. Las
imagenes requieren sesion y pertenencia del vehiculo o trabajo. Nginx bloquea
la ruta publica antigua `/uploads/reparaciones/`.

El cliente ve el estado actual de cada orden y trabajo, observaciones y fotos
ordenadas por su fecha real. El seguimiento se actualiza cada 30 segundos y
al volver a la ventana. No se inventan porcentajes, etapas completadas,
fechas anteriores ni un historial de estados. Las observaciones sin foto
representan el valor actual, no versiones historicas. `terminada` indica
trabajo terminado; el esquema no tiene un estado independiente de "listo para
entrega", por lo que no se afirma una disponibilidad de entrega inexistente.

## Pasarela ficticia

La pantalla Mis recibos utiliza exclusivamente POST `/api/pagos/simulados`.
Nunca llama a procesadores de tarjeta o a Nequi. Las integraciones reales
anteriores se conservan como modulos separados; este flujo no las invoca.
La pantalla siempre muestra PAGO SIMULADO y permite elegir el resultado.

Solo admite estos numeros ficticios en el navegador:

| Franquicia | Numero de demostracion |
| --- | --- |
| Visa | 4242424242424242 |
| Mastercard | 5555555555554444 |
| American Express | 378282246310005 |

Se verifica Luhn, vencimiento y formato del codigo ficticio. El celular Nequi
de demostracion es 3000000000. Numero completo, vencimiento, CVV y celular no
se envian al backend ni se guardan en almacenamiento del navegador. El backend
rechaza campos adicionales, incluidos monto y datos de tarjeta.

El servidor consulta el total real del recibo y su propietario. Solo permite
recibos pendientes enviados al cliente por el flujo existente (en bases antiguas
sin ese campo de envio, utiliza los recibos propios pendientes disponibles). Se bloquea la
fila del recibo y se guarda una referencia SIM- unica derivada de una clave de
idempotencia. Repetir esa misma solicitud devuelve el pago previo; no inserta
otra fila. Un pago completado o pendiente impide otro intento para el recibo.

| Resultado visual | pagos.estado existente | recibos.estado |
| --- | --- | --- |
| Aprobado | completado | pagado |
| Rechazado | anulado | pendiente |
| Pendiente | pendiente | pendiente |

`metodo_pago` usa solamente tarjeta o nequi; la franquicia no requiere un ENUM
nuevo ni se conserva como una columna inventada. Los pagos pendientes quedan
pendientes en el historial; no se cambia su resultado mediante una segunda
peticion con la misma clave.

## Pruebas

Desde la raiz, con dependencias instaladas:

```sh
python -m pytest backend/tests/test_improvements_isolated.py backend/tests/test_mail_payments_isolated.py backend/tests/test_google_identity_security.py backend/tests/test_recovery_steps_isolated.py -q
```

En frontend (Node 22.18+):

```sh
npm ci
npm run test:cards
npm run build
npx tsc --noEmit -p tsconfig.app.json
```

Las pruebas aisladas no crean esquemas, no conectan a MySQL ni envian correos
o pagos reales. Las pruebas optativas `test_improvements_mysql.py` verificaron
concurrencia con MySQL real, cancelacion/nueva reserva, pagos, fotos, observaciones
y control de acceso. Se habilitan con `JENNA_MYSQL_TESTS=1` y limpian solo sus
propios registros QA. El SMTP real no se ha probado; se sustituyo durante las
pruebas para evitar enviar mensajes.
No ejecutar indiscriminadamente toda la carpeta de tests antigua: contiene
pruebas que insertan y eliminan datos de una instancia MySQL.

Flask no inicializa el esquema al arrancar. El despliegue Docker utiliza un
servicio `migrate` separado; para bases SQL importadas sin version sigue primero
las instrucciones de MIGRACIONES.md.
