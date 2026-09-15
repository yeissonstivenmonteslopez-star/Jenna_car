from ..extensions import db
from ..models import Cliente, Cita, OrdenTrabajo, Usuario, Vehiculo


def get(vehicle_id):
    return db.session.get(Vehiculo, vehicle_id)


def get_for_client(vehicle_id, client_id):
    return Vehiculo.query.filter_by(id=vehicle_id, cliente_id=client_id).first()


def list_for_client(client_id):
    return Vehiculo.query.filter_by(cliente_id=client_id).order_by(Vehiculo.id.desc()).all()


def list_admin(query=''):
    base = Vehiculo.query.join(Cliente).join(Usuario)
    if query:
        base = base.filter((Vehiculo.placa.ilike(f'%{query}%')) | (Vehiculo.marca.ilike(f'%{query}%')) | (Vehiculo.modelo.ilike(f'%{query}%')) | (Usuario.nombre.ilike(f'%{query}%')) | (Usuario.apellido.ilike(f'%{query}%')))
    return base.order_by(Vehiculo.id.desc()).all()


def find_by_plate(plate, excluding_id=None):
    query = Vehiculo.query.filter(Vehiculo.placa == plate)
    if excluding_id:
        query = query.filter(Vehiculo.id != excluding_id)
    return query.first()


def add(vehicle):
    db.session.add(vehicle)
    return vehicle


def has_relations(vehicle_id):
    return bool(db.session.query(Cita.id).filter_by(vehiculo_id=vehicle_id).first() or db.session.query(OrdenTrabajo.id).filter_by(vehiculo_id=vehicle_id).first())


def delete(vehicle):
    db.session.delete(vehicle)


def commit():
    db.session.commit()