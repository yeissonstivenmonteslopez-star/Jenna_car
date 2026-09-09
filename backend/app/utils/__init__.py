"""Shared backend helpers grouped by validation, serialization, and domain work."""

from .notifications import notificacion_por_usuario
from .orders import apply_order_services, asegurar_recibo_orden, order_to_dict
from .payments import payment_to_dict
from ..schemas.serializers import cita_to_dict, service_to_dict, vehicle_to_dict
from .validation import validar_fecha_cita, validar_hora_cita, validar_placa

__all__ = [
    'apply_order_services',
    'asegurar_recibo_orden',
    'cita_to_dict',
    'notificacion_por_usuario',
    'order_to_dict',
    'payment_to_dict',
    'service_to_dict',
    'validar_fecha_cita',
    'validar_hora_cita',
    'validar_placa',
    'vehicle_to_dict',
]
