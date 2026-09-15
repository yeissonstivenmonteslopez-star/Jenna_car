from ..extensions import db
from ..models import Cita, OrdenServicio, Servicio


def get(service_id):
    return db.session.get(Servicio, service_id)


def list_public(query, estado):
    base = Servicio.query
    if query:
        base = base.filter((Servicio.nombre.ilike(f'%{query}%')) | (Servicio.descripcion.ilike(f'%{query}%')))
    return base.filter(Servicio.estado == (estado or 'activo')).order_by(Servicio.id).all()


def list_admin(query, estado):
    base = Servicio.query
    if query:
        base = base.filter((Servicio.nombre.ilike(f'%{query}%')) | (Servicio.descripcion.ilike(f'%{query}%')))
    if estado:
        base = base.filter(Servicio.estado == estado)
    return base.order_by(Servicio.id.desc()).all()


def find_by_name(name, excluding_id=None):
    query = Servicio.query.filter(Servicio.nombre.ilike(name))
    if excluding_id:
        query = query.filter(Servicio.id != excluding_id)
    return query.first()


def add(service):
    db.session.add(service)
    return service


def has_relations(service_id):
    return bool(Cita.query.filter_by(servicio_id=service_id).first() or OrdenServicio.query.filter_by(servicio_id=service_id).first())


def delete(service):
    db.session.delete(service)


def commit():
    db.session.commit()