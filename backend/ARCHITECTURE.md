# Responsabilidades del backend

El backend usa una separacion por capas. Cada capa debe tener una razon clara
para cambiar y no debe asumir el trabajo de otra capa.

## Capas

- `routes/`: solo define URLs, métodos HTTP y decoradores de protección.
  Delega inmediatamente al controlador; no lee `request` ni genera respuestas.
- `controllers/`: interacción HTTP. Extrae datos de `request`, realiza
  validaciones básicas de formato y genera respuestas JSON, archivos y códigos
  HTTP. No accede directamente a la base de datos ni contiene reglas de
  negocio.
- `services/`: casos de uso. Valida entradas, aplica reglas del dominio,
  coordina utilidades y controla `commit`/`rollback`. No debe conocer detalles
  de rutas HTTP.
- `repository/`: unica capa de acceso a datos. Contiene consultas SQLAlchemy,
  filtros, altas, cambios, bajas y operaciones de persistencia (`commit` y
  `rollback`). Devuelve modelos, listas o datos necesarios para el servicio.
  No debe contener reglas de negocio, HTTP, JWT ni contraseñas.
- `models/`: entidades SQLAlchemy, columnas, relaciones y restricciones del
  esquema. No debe contener lógica de endpoints.
- `schemas/`: serializacion y validacion de estructuras de entrada/salida
  compartidas.
- `utils/`: funciones reutilizables que no pertenecen a un caso de uso
  concreto, como serializadores, calculos o validaciones simples.
- `api.py`: composición de la API. Registra blueprints y rutas administrativas,
  pero no define handlers ni reglas de negocio.
- `auth/`: autenticación y autorización: hash/verificación, tokens JWT,
  middleware de protección y control de acceso por roles.

## Flujo esperado

`api -> route -> controller -> service -> repository -> model`

Las dependencias deben ir en ese sentido. Un servicio puede usar `utils` y
`schemas`; un repositorio no debe importar controladores ni servicios.

## Migracion incremental

Los módulos existentes se pueden mover por dominio, conservando las firmas
publicas y las URLs. Todos los endpoints actuales ya viven en `routes/`; sus
consultas y reglas se siguen migrando de forma independiente. El dominio de
órdenes es el primer ejemplo: sus consultas están en `repository/ordenes_r.py`,
mientras las reglas y transacciones siguen en `services/ordenes_s.py`.
## Separaciones por responsabilidad

- `services/mechanic_s.py` conserva las operaciones de escritura y los nombres
  publicos usados por las rutas. Las vistas de consulta del mecanico y del
  seguimiento estan en `services/mechanic_queries.py`.
- `documents/receipts.py` genera el recibo JENNACAR, incluye cabeceras y pies de
  pagina, ajusta conceptos largos y pagina el documento. No consulta MySQL ni
  recibe objetos HTTP. `services/recibos_s.py` mantiene consultas, permisos y
  compatibilidad con el punto de entrada `pdf` existente.
- `utils/images.py` centraliza la validacion de contenido y recodificacion de
  imagenes, compartida por fotos de perfil y avances. Un error de persistencia
  revierte la transaccion y elimina solo el archivo nuevo no confirmado.

En frontend se separo `VehicleEditor.tsx` y sus tipos de la pagina de listado.
No se dividieron archivos pequenos solo para reducir una cifra de lineas.

## Validacion de la revision

Se corrigieron las cargas duplicadas/obsoletas en listas, la URL del administrador
al recargar y los tipos de la busqueda global. Tambien el seguimiento que no
llenaba su lista principal de fotos y los identificadores invalidos de recibo.
No se cambiaron rutas, roles, esquema ni registros existentes para reorganizar.

Instala las dependencias de pruebas con `pip install -r requirements-dev.txt`.
Las pruebas aisladas cubren formato, recibos largos, reglas que no cruzan texto,
autenticacion y casos de uso. Las pruebas MySQL optativas usan registros QA y
solo limpian los registros creados por su propia prueba. Las pruebas de navegador
usan fixtures para evitar escrituras y cobros reales.

## Consultas de pagos

`services/payment_queries.py` concentra consultas de historial, detalle y listas
administrativas. `services/pagos_s.py` conserva creacion, simulacion y confirmacion
de pagos y reexporta las funciones de consulta con los mismos nombres para no
cambiar controladores ni rutas. La reorganizacion no requiere migraciones.
