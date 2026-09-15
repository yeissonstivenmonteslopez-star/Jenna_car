from ..extensions import db
from sqlalchemy import or_
from ..models import Cita, Cliente, Notificacion, OrdenServicio, OrdenTrabajo, Pago, PasswordResetToken, Recibo, Usuario, Vehiculo


def get(user_id):
    return db.session.get(Usuario, user_id)


def find_by_email(email):
    return Usuario.query.filter_by(email=email).first()


def find_by_google_id(google_id):
    return Usuario.query.filter_by(google_id=google_id).first()


def list_all():
    return Usuario.query.order_by(Usuario.created_at.desc()).all()


def count_admins():
    return Usuario.query.filter_by(rol='admin').count()


def save(user):
    db.session.add(user)
    db.session.commit()
    return user


def add_and_flush(user):
    db.session.add(user)
    db.session.flush()
    return user


def delete_many(user_ids):
    Usuario.query.filter(Usuario.id.in_(user_ids)).delete(synchronize_session=False)


def commit():
    db.session.commit()


def rollback():
    db.session.rollback()


def delete_cascade(user_ids, client_ids, order_ids, receipt_ids):
    PasswordResetToken.query.filter(PasswordResetToken.usuario_id.in_(user_ids)).delete(synchronize_session=False)
    Notificacion.query.filter(Notificacion.usuario_id.in_(user_ids)).delete(synchronize_session=False)
    Pago.query.filter(Pago.usuario_id.in_(user_ids)).delete(synchronize_session=False)
    if receipt_ids:
        Pago.query.filter(Pago.recibo_id.in_(receipt_ids)).delete(synchronize_session=False)
        Recibo.query.filter(Recibo.id.in_(receipt_ids)).delete(synchronize_session=False)
    if order_ids:
        OrdenServicio.query.filter(OrdenServicio.orden_id.in_(order_ids)).delete(synchronize_session=False)
        OrdenTrabajo.query.filter(OrdenTrabajo.id.in_(order_ids)).delete(synchronize_session=False)
    if client_ids:
        Cita.query.filter(Cita.cliente_id.in_(client_ids)).delete(synchronize_session=False)
        Vehiculo.query.filter(Vehiculo.cliente_id.in_(client_ids)).delete(synchronize_session=False)
        Cliente.query.filter(Cliente.id.in_(client_ids)).delete(synchronize_session=False)
    Usuario.query.filter(Usuario.id.in_(user_ids)).delete(synchronize_session=False)


def related_ids(client_ids):
    order_ids = [order.id for order in OrdenTrabajo.query.filter(OrdenTrabajo.cliente_id.in_(client_ids)).all()] if client_ids else []
    conditions = []
    if client_ids:
        conditions.append(Recibo.cliente_id.in_(client_ids))
    if order_ids:
        conditions.append(Recibo.orden_id.in_(order_ids))
    receipt_ids = [receipt.id for receipt in Recibo.query.filter(or_(*conditions)).all()] if conditions else []
    return order_ids, receipt_ids