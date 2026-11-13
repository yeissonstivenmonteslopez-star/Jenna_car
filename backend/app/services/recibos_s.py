"""Receipt queries, ownership checks, and PDF generation."""
from ..documents.receipts import build_receipt_pdf as pdf
from ..extensions import db
from ..models import OrdenTrabajo, Recibo, Vehiculo
from .schema_compat import optional_read, column_exists

def list_for_user(user_id):
    from sqlalchemy.orm import selectinload
    receipts = (
        Recibo.query
        .options(*optional_read(Recibo, 'enviado_cliente'),
                 selectinload(Recibo.orden_trabajo).options(*optional_read(OrdenTrabajo, 'estado_aprobacion')))
        .join(Recibo.orden_trabajo)
        .join(OrdenTrabajo.vehiculo)
        .filter(Vehiculo.usuario_id == user_id)
    )
    if column_exists('recibos', 'enviado_cliente'):
        receipts = receipts.filter(Recibo.enviado_cliente.is_(True))
    receipts = (
        receipts
        .order_by(Recibo.fecha_emision.desc(), Recibo.id.desc())
        .all()
    )
    return [_receipt_summary(receipt) for receipt in receipts]


def _receipt_summary(receipt):
    order = receipt.orden_trabajo
    vehicle = order.vehiculo if order else None
    issued = receipt.fecha_emision.isoformat() if receipt.fecha_emision else None
    return {
        'id': receipt.id,
        'orden_trabajo_id': receipt.orden_id,
        'orden_id': receipt.orden_id,
        'fecha_ingreso': order.fecha_ingreso.isoformat() if order and order.fecha_ingreso else issued,
        'fecha_emision': issued,
        'vehiculo_id': order.vehiculo_id if order else 0,
        'vehiculo': {
            'id': vehicle.id, 'marca': vehicle.marca,
            'modelo': vehicle.modelo, 'placa': vehicle.placa,
        } if vehicle else None,
        'estado': receipt.estado,
        'subtotal': float(receipt.subtotal),
        'descuento': float(receipt.descuento),
        'total': float(receipt.total),
        'creado_en': issued,
    }


def find_owned(user, receipt_id):
    receipt = db.session.get(Recibo, receipt_id)
    if not receipt: return None, 'Recibo no encontrado', 404
    order = db.session.get(OrdenTrabajo, receipt.orden_id)
    if not order: return None, 'Orden relacionada no encontrada', 404
    if user.rol != 'admin':
        if not order.vehiculo or order.vehiculo.usuario_id != user.id: return None, 'No tienes permisos para ver este recibo', 403
        if not receipt.enviado_cliente: return None, 'Recibo no encontrado', 404
    return receipt, None, None
