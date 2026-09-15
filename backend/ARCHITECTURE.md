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