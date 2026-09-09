"""Public HTTP API surface: blueprint exports and route registration metadata."""

from ..controllers.auth_bp import auth_bp
from ..controllers.citas_bp import admin_cita_detalle, admin_citas, actualizar_estado_cita, citas_bp, crear_cita_admin
from ..controllers.dashboard_bp import admin_dashboard
from ..controllers.health_bp import health_bp
from ..controllers.notificaciones_bp import admin_actualizar_notificacion, admin_notificacion_detalle, admin_notificaciones, crear_notificacion_admin, notificaciones_bp
from ..controllers.ordenes_bp import admin_ordenes, actualizar_orden_admin, crear_orden_admin, eliminar_orden_admin, obtener_orden_admin
from ..controllers.pagos_bp import admin_pago_detalle, admin_pagos, pagos_bp
from ..controllers.recibos_bp import recibos_bp
from ..controllers.search_bp import admin_search
from ..controllers.servicios_bp import actualizar_servicio_admin, admin_servicio_detalle, admin_servicios, crear_servicio_admin, eliminar_servicio_admin, servicios_bp
from ..controllers.usuarios_bp import admin_usuarios, cambiar_rol_usuario, eliminar_usuarios, foto_perfil, usuarios_bp
from ..controllers.vehiculos_bp import actualizar_vehiculo_admin, admin_vehiculo_detalle, admin_vehiculos, crear_vehiculo_admin, eliminar_vehiculo_admin, vehiculos_bp

BLUEPRINT_REGISTRATIONS = [
    (servicios_bp, '/api/services'),
    (vehiculos_bp, '/api/vehiculos'),
    (citas_bp, '/api/citas'),
    (auth_bp, '/api/auth'),
    (notificaciones_bp, '/api/notificaciones'),
    (pagos_bp, '/api/pagos'),
    (recibos_bp, '/api/recibos'),
    (usuarios_bp, '/api/usuarios'),
    (health_bp, '/api/health'),
]

ADMIN_ROUTES = [
    ('/api/admin/servicios', admin_servicios, 'admin_servicios', None),
    ('/api/admin/servicios/<int:servicio_id>', admin_servicio_detalle, 'admin_servicio_detalle', None),
    ('/api/admin/vehiculos', admin_vehiculos, 'admin_vehiculos', None),
    ('/api/admin/vehiculos/<int:vehiculo_id>', admin_vehiculo_detalle, 'admin_vehiculo_detalle', None),
    ('/api/admin/citas', admin_citas, 'admin_citas', None),
    ('/api/admin/ordenes', admin_ordenes, 'admin_ordenes', None),
    ('/api/admin/ordenes/<int:orden_id>', obtener_orden_admin, 'obtener_orden_admin', None),
    ('/api/admin/search', admin_search, 'admin_search', None),
    ('/api/admin/notificaciones', admin_notificaciones, 'admin_notificaciones', None),
    ('/api/admin/notificaciones/<int:notificacion_id>', admin_notificacion_detalle, 'admin_notificacion_detalle', None),
    ('/api/admin/dashboard', admin_dashboard, 'admin_dashboard', None),
    ('/api/admin/usuarios', admin_usuarios, 'admin_usuarios', None),
    ('/api/admin/pagos', admin_pagos, 'admin_pagos', None),
    ('/api/admin/pagos/<int:pago_id>', admin_pago_detalle, 'admin_pago_detalle', None),
    ('/api/admin/servicios', crear_servicio_admin, 'crear_servicio_admin', ['POST']),
    ('/api/admin/servicios/<int:servicio_id>', actualizar_servicio_admin, 'actualizar_servicio_admin', ['PUT']),
    ('/api/admin/servicios/<int:servicio_id>', eliminar_servicio_admin, 'eliminar_servicio_admin', ['DELETE']),
    ('/api/admin/vehiculos', crear_vehiculo_admin, 'crear_vehiculo_admin', ['POST']),
    ('/api/admin/vehiculos/<int:vehiculo_id>', actualizar_vehiculo_admin, 'actualizar_vehiculo_admin', ['PUT']),
    ('/api/admin/vehiculos/<int:vehiculo_id>', eliminar_vehiculo_admin, 'eliminar_vehiculo_admin', ['DELETE']),
    ('/api/admin/citas', crear_cita_admin, 'crear_cita_admin', ['POST']),
    ('/api/admin/citas/<int:cita_id>/estado', actualizar_estado_cita, 'actualizar_estado_cita', ['PUT']),
    ('/api/admin/ordenes', crear_orden_admin, 'crear_orden_admin', ['POST']),
    ('/api/admin/ordenes/<int:orden_id>', actualizar_orden_admin, 'actualizar_orden_admin', ['PUT']),
    ('/api/admin/ordenes/<int:orden_id>', eliminar_orden_admin, 'eliminar_orden_admin', ['DELETE']),
    ('/api/admin/notificaciones', crear_notificacion_admin, 'crear_notificacion_admin', ['POST']),
    ('/api/admin/notificaciones/<int:notificacion_id>', admin_actualizar_notificacion, 'admin_actualizar_notificacion', ['PATCH']),
    ('/api/admin/citas/<int:cita_id>', admin_cita_detalle, 'admin_cita_detalle', ['GET', 'PUT', 'DELETE']),
    ('/api/admin/usuarios/<int:usuario_id>/rol', cambiar_rol_usuario, 'cambiar_rol_usuario', ['PUT']),
    ('/api/admin/usuarios/bulk', eliminar_usuarios, 'eliminar_usuarios', ['DELETE']),
]
