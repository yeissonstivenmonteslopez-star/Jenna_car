from ..extensions import db
from sqlalchemy import or_
from ..models import Cita, Diagnostico, ImagenTrabajo, Notificacion, OrdenTrabajo, Pago, PasswordResetToken, Recibo, ReciboDetalle, Trabajo, Usuario, Vehiculo


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
        ReciboDetalle.query.filter(ReciboDetalle.recibo_id.in_(receipt_ids)).delete(synchronize_session=False)
        Recibo.query.filter(Recibo.id.in_(receipt_ids)).delete(synchronize_session=False)
    if order_ids:
        Trabajo.query.filter(Trabajo.orden_id.in_(order_ids)).update({Trabajo.orden_id: None}, synchronize_session=False)
        OrdenTrabajo.query.filter(OrdenTrabajo.id.in_(order_ids)).delete(synchronize_session=False)
    if client_ids:
        vehicle_ids = [item.id for item in Vehiculo.query.filter(Vehiculo.usuario_id.in_(client_ids)).all()]
        cita_ids = [item.id for item in Cita.query.filter(Cita.vehiculo_id.in_(vehicle_ids)).all()] if vehicle_ids else []
        diagnostico_ids = [item.id for item in Diagnostico.query.filter(Diagnostico.cita_id.in_(cita_ids)).all()] if cita_ids else []
        trabajo_ids = [item.id for item in Trabajo.query.filter(Trabajo.diagnostico_id.in_(diagnostico_ids)).all()] if diagnostico_ids else []
        if trabajo_ids:
            ImagenTrabajo.query.filter(ImagenTrabajo.trabajo_id.in_(trabajo_ids)).delete(synchronize_session=False)
            Trabajo.query.filter(Trabajo.id.in_(trabajo_ids)).delete(synchronize_session=False)
        if diagnostico_ids:
            Diagnostico.query.filter(Diagnostico.id.in_(diagnostico_ids)).delete(synchronize_session=False)
        if cita_ids:
            Cita.query.filter(Cita.id.in_(cita_ids)).delete(synchronize_session=False)
        if vehicle_ids:
            Vehiculo.query.filter(Vehiculo.id.in_(vehicle_ids)).delete(synchronize_session=False)
    Usuario.query.filter(Usuario.id.in_(user_ids)).delete(synchronize_session=False)


def related_ids(client_ids):
    order_ids = [order.id for order in OrdenTrabajo.query.join(OrdenTrabajo.vehiculo).filter(Vehiculo.usuario_id.in_(client_ids)).all()] if client_ids else []
    conditions = []
    if order_ids:
        conditions.append(Recibo.orden_id.in_(order_ids))
    receipt_ids = [receipt.id for receipt in Recibo.query.filter(or_(*conditions)).all()] if conditions else []
    return order_ids, receipt_ids