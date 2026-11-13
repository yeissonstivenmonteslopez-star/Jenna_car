"""Revise a rejected quote without discarding its work or receipt lines."""
from decimal import Decimal, InvalidOperation
from ..extensions import db
from ..models import OrdenTrabajo
from ..utils.notifications import notificacion_por_usuario


def revise(user, order_id, payload):
    order = OrdenTrabajo.query.filter_by(id=order_id).with_for_update().populate_existing().first()
    if not order or not order.trabajos or any(work.mecanico_id != user.id for work in order.trabajos):
        db.session.rollback()
        return None, 'Orden no disponible para este mecánico', 404
    receipt = order.recibo
    if order.estado_aprobacion != 'rechazado' or order.estado in {'cancelada', 'entregada'} or not receipt or receipt.estado != 'pendiente' or receipt.enviado_cliente:
        db.session.rollback()
        return None, 'Solo puedes revisar una cotización rechazada y pendiente de pago', 409
    try:
        total = Decimal(str(payload.get('total')))
        subtotal = Decimal(str(order.subtotal))
        if not total.is_finite() or total <= 0 or total > subtotal or total != total.quantize(Decimal('.01')):
            raise ValueError()
    except (InvalidOperation, ValueError, TypeError):
        db.session.rollback()
        return None, 'Ingresa un total positivo que no supere el subtotal, con hasta dos decimales', 400
    order.total = receipt.total = total
    receipt.descuento = subtotal - total
    order.estado_aprobacion = 'pendiente'
    notificacion_por_usuario(order.vehiculo.usuario_id,
        f'Nueva cotización de la orden #{order.id}',
        'El mecánico revisó la propuesta. Revisa el nuevo total y decide si lo apruebas.',
        tipo='diagnostico', link='/mis-reparaciones', do_commit=False)
    db.session.commit()
    return {'id': order.id, 'estado_aprobacion': 'pendiente', 'total': float(total)}, None, 200
