"""Acceso a datos de las órdenes de trabajo.

Este módulo encapsula las consultas SQLAlchemy usadas por el caso de uso de
órdenes. Las reglas de negocio y el control de transacciones permanecen en el
servicio.
"""
from ..extensions import db
from ..models import Cliente, OrdenTrabajo, Vehiculo


def list_all():
    return (
        OrdenTrabajo.query
        .order_by(OrdenTrabajo.created_at.desc(), OrdenTrabajo.id.desc())
        .all()
    )


def get(order_id):
    return db.session.get(OrdenTrabajo, order_id)


def get_customer(customer_id):
    return db.session.get(Cliente, customer_id)


def get_vehicle(vehicle_id):
    return db.session.get(Vehiculo, vehicle_id)