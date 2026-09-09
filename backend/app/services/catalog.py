"""Service catalog operations independent from Flask route handlers."""

from decimal import Decimal


DEFAULT_SERVICES = (
    {
        'nombre': 'Mantenimiento',
        'descripcion': 'Revisión y mantenimiento preventivo',
        'precio': Decimal('120000.00'),
        'duracion_estimada': 90,
        'estado': 'activo',
    },
    {
        'nombre': 'Diagnóstico',
        'descripcion': 'Diagnóstico electrónico avanzado',
        'precio': Decimal('180000.00'),
        'duracion_estimada': 60,
        'estado': 'activo',
    },
    {
        'nombre': 'Estética premium',
        'descripcion': 'Cuidado exterior e interior',
        'precio': Decimal('250000.00'),
        'duracion_estimada': 120,
        'estado': 'activo',
    },
)


def serialize_service(service):
    return {
        'id': service.id,
        'name': service.nombre,
        'description': service.descripcion,
        'price': float(service.precio),
        'duration_minutes': service.duracion_estimada,
    }


def seed_services(service_model, session):
    """Insert the initial catalog only when the table is empty."""
    if service_model.query.count() != 0:
        return False

    session.add_all(service_model(**values) for values in DEFAULT_SERVICES)
    return True
