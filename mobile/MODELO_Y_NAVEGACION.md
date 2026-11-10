# Modelo de datos y alcance móvil

Jenna Car gestiona vehículos, citas, diagnósticos, trabajos, recibos, pagos y avisos de un taller. Se conserva Flask/MySQL y el contrato de su API. No se ejecutaron migraciones ni se consultó la BD configurada. El análisis usa SQL, migraciones y modelos; debe verificarse la versión desplegada.

## Tablas y columnas
Las columnas siguientes son las declaradas en los modelos vigentes. Los FK muestran sus relaciones. Cliente es un alias de Usuario; cliente_id en varios DTO es derivado, no una nueva columna.

### citas

| Campo | Declaración (tipo, restricciones y relación) |
| --- | --- |
| id | `db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)` |
| vehiculo_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('vehiculos.id', name='fk_citas_vehiculo', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False)` |
| mecanico_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id', ondelete='SET NULL', onupdate='CASCADE'), nullable=True)` |
| servicio_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('servicios.id', name='fk_citas_servicio', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False)` |
| fecha | `db.Column(db.Date, nullable=False)` |
| hora | `db.Column(db.Time, nullable=False)` |
| motivo | `db.Column(db.Text, nullable=True)` |
| observaciones | `db.Column(db.Text, nullable=True)` |
| estado | `db.Column(SaEnum('pendiente', 'confirmada', 'atendida', 'cancelada', name='cita_estado'), nullable=False, default='pendiente')` |
| created_at | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))` |
| updated_at | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))` |

### diagnosticos

| Campo | Declaración (tipo, restricciones y relación) |
| --- | --- |
| id | `db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)` |
| cita_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('citas.id', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False, index=True)` |
| mecanico_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False, index=True)` |
| descripcion | `db.Column(db.Text, nullable=False)` |
| observaciones | `db.Column(db.Text, nullable=True)` |
| solucion_recomendada | `db.Column(db.Text, nullable=True)` |
| estado | `db.Column(db.Enum('pendiente', 'en_proceso', 'completado', name='diagnostico_estado'), nullable=False, default='pendiente')` |
| fecha_diagnostico | `db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))` |
| created_at | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))` |
| updated_at | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))` |

### imagenes_trabajo

| Campo | Declaración (tipo, restricciones y relación) |
| --- | --- |
| id | `db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)` |
| trabajo_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('trabajos.id', ondelete='CASCADE', onupdate='CASCADE'), nullable=False, index=True)` |
| usuario_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False, index=True)` |
| ruta_imagen | `db.Column(db.String(500), nullable=False)` |
| descripcion | `db.Column(db.String(255), nullable=True)` |
| created_at | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))` |

### notificaciones

| Campo | Declaración (tipo, restricciones y relación) |
| --- | --- |
| id | `db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)` |
| usuario_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id', name='fk_notificaciones_usuario', ondelete='CASCADE', onupdate='CASCADE'), nullable=False, index=True)` |
| titulo | `db.Column(db.String(150), nullable=False)` |
| mensaje | `db.Column(db.Text, nullable=False)` |
| tipo | `db.Column(db.String(50), nullable=False, default='sistema')` |
| leida | `db.Column(db.Boolean, default=False, nullable=False)` |
| link | `db.Column(db.String(255), nullable=True)` |
| created_at | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), nullable=False)` |

### ordenes_trabajo

| Campo | Declaración (tipo, restricciones y relación) |
| --- | --- |
| id | `db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)` |
| vehiculo_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('vehiculos.id', name='fk_orden_vehiculo', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False)` |
| fecha_ingreso | `db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))` |
| fecha_entrega | `db.Column(db.DateTime, nullable=True)` |
| kilometraje | `db.Column(INTEGER(unsigned=True), nullable=False, default=0)` |
| problema_reportado | `db.Column(db.Text, nullable=False)` |
| observaciones | `db.Column(db.Text, nullable=True)` |
| estado | `db.Column(SaEnum('pendiente', 'en_diagnostico', 'en_reparacion', 'terminada', 'entregada', 'cancelada', name='orden_estado'), nullable=False, default='pendiente')` |
| subtotal | `db.Column(Numeric(10, 2), nullable=False, default=0.00)` |
| total | `db.Column(Numeric(10, 2), nullable=False, default=0.00)` |
| created_at | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))` |
| updated_at | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))` |

### pagos

| Campo | Declaración (tipo, restricciones y relación) |
| --- | --- |
| id | `db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)` |
| recibo_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('recibos.id', name='fk_pagos_recibo', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False)` |
| usuario_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id', name='fk_pagos_usuario', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False)` |
| monto | `db.Column(db.Numeric(10, 2), nullable=False)` |
| mercado_pago_payment_id | `db.Column(db.String(100), nullable=True)` |
| mercado_pago_status | `db.Column(db.String(50), nullable=True, default='pending')` |
| mercado_pago_reference | `db.Column(db.String(100), nullable=True)` |
| metodo_pago | `db.Column(db.Enum('efectivo', 'tarjeta', 'transferencia', 'nequi', 'pse', 'mercado_pago', 'otro', name='pago_metodo'), nullable=False, default='nequi')` |
| numero_nequi | `db.Column(db.String(20), nullable=True)` |
| referencia | `db.Column(db.String(100), nullable=True, unique=True)` |
| estado | `db.Column(db.Enum('completado', 'pendiente', 'anulado', name='pago_estado'), nullable=False, default='completado')` |
| fecha_pago | `db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))` |
| creado_en | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))` |

### password_reset_tokens

| Campo | Declaración (tipo, restricciones y relación) |
| --- | --- |
| id | `db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)` |
| usuario_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id', name='fk_reset_usuario', ondelete='CASCADE', onupdate='CASCADE'), nullable=False, index=True)` |
| code_hash | `db.Column(db.String(255), nullable=False)` |
| expires_at | `db.Column(db.DateTime, nullable=False, index=True)` |
| attempts | `db.Column(SMALLINT(unsigned=True), nullable=False, default=0)` |
| used_at | `db.Column(db.DateTime, nullable=True)` |
| created_at | `db.Column(TIMESTAMP, nullable=False, default=lambda: datetime.now(timezone.utc))` |

### recibos

| Campo | Declaración (tipo, restricciones y relación) |
| --- | --- |
| id | `db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)` |
| orden_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('ordenes_trabajo.id', name='fk_recibos_orden', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False, unique=True)` |
| fecha_emision | `db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))` |
| subtotal | `db.Column(db.Numeric(10, 2), nullable=False, default=0.00)` |
| total | `db.Column(db.Numeric(10, 2), nullable=False, default=0.00)` |
| descuento | `db.Column(db.Numeric(10, 2), nullable=False, default=0.00)` |
| estado | `db.Column(db.Enum('pendiente', 'pagado', 'anulado', name='recibo_estado'), nullable=False, default='pendiente')` |

### recibo_detalles

| Campo | Declaración (tipo, restricciones y relación) |
| --- | --- |
| id | `db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)` |
| recibo_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('recibos.id', ondelete='CASCADE', onupdate='CASCADE'), nullable=False, index=True)` |
| descripcion | `db.Column(db.String(255), nullable=False)` |
| cantidad | `db.Column(INTEGER(unsigned=True), nullable=False, default=1)` |
| precio_unitario | `db.Column(db.Numeric(10, 2), nullable=False)` |
| subtotal | `db.Column(db.Numeric(10, 2), nullable=False)` |

### servicios

| Campo | Declaración (tipo, restricciones y relación) |
| --- | --- |
| id | `db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)` |
| nombre | `db.Column(db.String(100), nullable=False)` |
| descripcion | `db.Column(db.Text, nullable=True)` |
| precio | `db.Column(db.Numeric(10, 2), nullable=False, default=0.00)` |
| duracion_estimada | `db.Column(INTEGER(unsigned=True), nullable=True)` |
| estado | `db.Column(db.Enum('activo', 'inactivo', name='servicio_estado'), nullable=False, default='activo')` |
| created_at | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))` |
| updated_at | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))` |

### trabajos

| Campo | Declaración (tipo, restricciones y relación) |
| --- | --- |
| id | `db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)` |
| diagnostico_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('diagnosticos.id', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False, index=True)` |
| servicio_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('servicios.id', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False, index=True)` |
| mecanico_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False, index=True)` |
| orden_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('ordenes_trabajo.id', ondelete='SET NULL', onupdate='CASCADE'), nullable=True, index=True)` |
| descripcion | `db.Column(db.Text, nullable=False)` |
| estado | `db.Column(db.Enum('pendiente', 'en_proceso', 'completado', 'cancelado', name='trabajo_estado'), nullable=False, default='pendiente', index=True)` |
| fecha_inicio | `db.Column(db.DateTime, nullable=True)` |
| fecha_fin | `db.Column(db.DateTime, nullable=True)` |
| cantidad | `db.Column(INTEGER(unsigned=True), nullable=False, default=1)` |
| precio | `db.Column(db.Numeric(10, 2), nullable=False, default=0.00)` |
| subtotal | `db.Column(db.Numeric(10, 2), nullable=False, default=0.00)` |
| created_at | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))` |
| updated_at | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))` |

### usuarios

| Campo | Declaración (tipo, restricciones y relación) |
| --- | --- |
| id | `db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)` |
| nombre | `db.Column(db.String(100), nullable=False)` |
| apellido | `db.Column(db.String(100), nullable=False)` |
| email | `db.Column(db.String(150), nullable=False, unique=True, index=True)` |
| password | `db.Column(db.String(255), nullable=True)` |
| google_id | `db.Column(db.String(255), nullable=True, unique=True)` |
| telefono | `db.Column(db.String(20), nullable=True)` |
| documento | `db.Column(db.String(30), nullable=True, unique=True)` |
| direccion | `db.Column(db.String(255), nullable=True)` |
| ciudad | `db.Column(db.String(100), nullable=True)` |
| fecha_registro | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))` |
| rol | `db.Column(db.Enum('admin', 'usuario', 'mecanico', name='usuario_rol'), nullable=False, default='usuario')` |
| estado | `db.Column(db.Enum('activo', 'inactivo', name='usuario_estado'), nullable=False, default='activo')` |
| foto_perfil | `db.Column(db.String(500), nullable=True)` |
| created_at | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))` |
| updated_at | `db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))` |

### vehiculos

| Campo | Declaración (tipo, restricciones y relación) |
| --- | --- |
| id | `db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)` |
| usuario_id | `db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False)` |
| placa | `db.Column(db.String(20), nullable=False, unique=True)` |
| marca | `db.Column(db.String(100), nullable=False)` |
| modelo | `db.Column(db.String(100), nullable=False)` |
| anio | `db.Column(db.Integer().with_variant(YEAR, 'mysql'), nullable=True)` |
| color | `db.Column(db.String(50), nullable=True)` |
| kilometraje | `db.Column(INTEGER(unsigned=True), nullable=False, default=0)` |
| tipo_combustible | `db.Column(db.Enum('gasolina', 'diesel', 'hibrido', 'electrico', 'gas', name='vehiculo_combustible'), nullable=False, default='gasolina')` |
| estado | `db.Column(db.Enum('activo', 'en_mantenimiento', 'inactivo', name='vehiculo_estado'), nullable=False, default='activo')` |
| created_at | `db.Column(db.TIMESTAMP, default=lambda: datetime.now(timezone.utc))` |
| updated_at | `db.Column(db.TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))` |

## Migraciones y diferencias

a8a75cb4e32e crea el esquema antiguo; b7f3c9e1a2d4 normaliza las rutas de fotos; c91d4e7a2b60 fusiona clientes con usuarios, elimina orden_servicios, añade diagnósticos, trabajos, imágenes y recibo_detalles; d82e6a3f4b10 añade seguimiento Mercado Pago. El SQL de referencia puede no incluir esta última ampliación. No se aplicó ninguna.

## Matriz de permisos y navegación

| Rol | Pantallas y datos |
| --- | --- |
| usuario | Inicio → vehículos propios → progreso; citas propias → crear/cancelar; recibos propios → checkout; historial de pagos |
| mecanico | Mi jornada → agenda asignada → detalle → diagnóstico, servicios, costos y fotos; trabajos → iniciar/finalizar; historial; órdenes vinculadas (lectura) |
| admin | Inicio → usuarios/roles, clientes, vehículos, citas y asignación de mecánico, servicios, órdenes, pagos, notificaciones |
| Todos autenticados | Perfil → editar nombre/apellido/teléfono; notificaciones → leer; ajustes → tema/cerrar sesión; ayuda |
| Público | Splash → login / registro / recuperar contraseña; Google conserva configuración existente |

Los navegadores desmontan rutas de otros roles. El servidor valida JWT, estado activo, rol y pertenencia en el flujo mecánico. En formularios de recursos también se verifica el rol. Los filtros se aplican a los datos autorizados por el servidor.

## Supuestos y límites

- Los roles válidos son admin, usuario y mecanico; el registro público no elige rol.
- La asignación mecánica parte de citas.mecanico_id. Una orden solo aparece al mecánico si trabajos.orden_id la relaciona con un trabajo suyo. No se deduce una asignación únicamente por compartir vehículo.
- Los importes se muestran en COP y los estados conservan los enums existentes.
- El diagnóstico admite observaciones libres, sin convertirlas en un checklist ficticio.
- La edición de disponibilidad y el inventario de repuestos no se implementan porque faltan sus entidades.
- La aplicación no ha sido probada en un dispositivo físico ni contra la BD real. Las comprobaciones estáticas no sustituyen una prueba de login por rol y checkout.

## Cambios sugeridos a la BD (no aplicados)

1. Inventario de repuestos y consumos asociados a trabajos, con stock y costos.
2. Plantillas de checklist e ítems de revisión con resultados, autor y fecha.
3. Turnos y disponibilidad de mecánicos; estado activo de usuario no equivale a disponibilidad.
4. Historial de cambios de estado y observaciones con autor/fecha.
5. Relación explícita de cita y orden para asignación inequívoca.
6. Revisar si debe existir un único diagnóstico por cita: el servicio lo exige, pero falta una restricción UNIQUE.
