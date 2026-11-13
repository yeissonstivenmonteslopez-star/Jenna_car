"""Read-only payment queries and serialized views."""
from ..extensions import db
from ..models import OrdenTrabajo, Pago, Recibo, Usuario, Vehiculo
from ..utils.payments import payment_to_dict


def payment_query():
    # Local simulation also works before adding the provider tracking columns.
    from sqlalchemy.orm import defer
    query = Pago.query
    query = query.options(defer(Pago.mercado_pago_payment_id), defer(Pago.mercado_pago_status), defer(Pago.mercado_pago_reference))
    return query



def admin_list(filters):
    query, reference, client, state, date = (filters.get(key, '') for key in ('q', 'referencia', 'cliente', 'estado', 'fecha'))
    base = payment_query().join(Pago.recibo).join(Recibo.orden_trabajo).join(OrdenTrabajo.vehiculo).join(Vehiculo.cliente)
    if query: base = base.filter((Pago.referencia.ilike(f'%{query}%')) | (Usuario.nombre.ilike(f'%{query}%')) | (Usuario.apellido.ilike(f'%{query}%')) | (Usuario.email.ilike(f'%{query}%')))
    if reference: base = base.filter(Pago.referencia.ilike(f'%{reference}%'))
    if client: base = base.filter((Usuario.nombre.ilike(f'%{client}%')) | (Usuario.apellido.ilike(f'%{client}%')) | (Usuario.email.ilike(f'%{client}%')))
    if state: base = base.filter(Pago.estado.ilike(f'%{state}%'))
    if date: base = base.filter(db.func.date(Pago.fecha_pago) == date)
    return [payment_to_dict(item) for item in base.order_by(Pago.fecha_pago.desc(), Pago.id.desc()).all()]



def get(payment_id):
    return payment_query().filter(Pago.id == payment_id).first()



def get_for_user(user_id, payment_id):
    payment = (payment_query().join(Pago.recibo).join(Recibo.orden_trabajo)
               .join(OrdenTrabajo.vehiculo).filter(Pago.id == payment_id, Vehiculo.usuario_id == user_id).first())
    return (payment_to_dict(payment), None, None) if payment else (None, 'Pago no encontrado', 404)



def list_for_user(user_id):
    payments = (payment_query().join(Pago.recibo).join(Recibo.orden_trabajo).join(OrdenTrabajo.vehiculo)
                .filter(Vehiculo.usuario_id == user_id).order_by(Pago.fecha_pago.desc(), Pago.id.desc()).all())
    return [payment_to_dict(item) for item in payments], None, None

