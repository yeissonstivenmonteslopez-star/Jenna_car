from datetime import datetime
from decimal import Decimal


def order_to_dict(order):
    if order and not order.recibo and order.id:
        try:
            asegurar_recibo_orden(order, do_commit=True)
        except Exception:
            from ..extensions import db
            db.session.rollback()

    receipt = order.recibo if order else None
    return {
        'id': order.id,
        'cliente': {
            'id': order.vehiculo.usuario_id,
            'nombre': order.vehiculo.cliente.nombre,
            'apellido': order.vehiculo.cliente.apellido,
        },
        'vehiculo': {
            'id': order.vehiculo.id,
            'marca': order.vehiculo.marca,
            'modelo': order.vehiculo.modelo,
            'placa': order.vehiculo.placa,
        },
        'fecha_ingreso': order.fecha_ingreso.isoformat() if order.fecha_ingreso else None,
        'fecha_entrega': order.fecha_entrega.isoformat() if order.fecha_entrega else None,
        'kilometraje': order.kilometraje,
        'problema_reportado': order.problema_reportado,
        'diagnostico': order.diagnostico,
        'trabajo_realizado': order.trabajo_realizado,
        'observaciones': order.observaciones,
        'estado': order.estado,
        'subtotal': float(order.subtotal),
        'total': float(order.total),
        'recibo': {
            'id': receipt.id,
            'estado': receipt.estado,
            'subtotal': float(receipt.subtotal),
            'total': float(receipt.total),
        } if receipt else None,
        'servicios': [
            {
                'id': item.id,
                'servicio_id': None,
                'nombre': item.descripcion,
                'cantidad': item.cantidad,
                'precio': float(item.precio_unitario),
                'subtotal': float(item.subtotal),
            }
            for item in receipt.detalles
        ] if receipt else [],
    }


def asegurar_recibo_orden(orden, do_commit=False):
    from ..models import Recibo
    from ..extensions import db

    if not orden or not orden.id:
        return None
    recibo = Recibo.query.filter_by(orden_id=orden.id).first()
    subtotal = Decimal(str(orden.subtotal or 0.00))
    total = Decimal(str(orden.total or 0.00))
    descuento = max(subtotal - total, Decimal('0.00'))
    if not recibo:
        recibo = Recibo(
            orden_id=orden.id,
            fecha_emision=datetime.now(),
            subtotal=subtotal,
            descuento=descuento,
            total=total,
            estado='pendiente',
        )
        db.session.add(recibo)
    else:
        recibo.subtotal = subtotal
        recibo.descuento = descuento
        recibo.total = total
    if do_commit:
        db.session.commit()
    return recibo


def apply_order_services(order, service_items):
    from ..models import ReciboDetalle, Servicio
    from ..extensions import db

    receipt = asegurar_recibo_orden(order)
    receipt.detalles.clear()
    subtotal = Decimal('0.00')
    for item in service_items or []:
        service = db.session.get(Servicio, item.get('servicio_id'))
        quantity = int(item.get('cantidad', 1))
        if not service or service.estado != 'activo' or quantity < 1:
            raise ValueError('Servicio o cantidad inválidos')
        price = Decimal(str(item.get('precio', service.precio)))
        line_total = price * quantity
        receipt.detalles.append(ReciboDetalle(
            descripcion=service.nombre,
            cantidad=quantity,
            precio_unitario=price,
            subtotal=line_total,
        ))
        subtotal += line_total
    order.subtotal = subtotal
    order.total = subtotal
    receipt.subtotal = subtotal
    receipt.total = subtotal
    receipt.descuento = Decimal('0.00')


def set_order_amount(order, amount):
    from ..models import ReciboDetalle

    try:
        total = Decimal(str(amount))
    except Exception as exc:
        raise ValueError('El total debe ser un importe válido') from exc
    if not total.is_finite() or total < 0:
        raise ValueError('El total no puede ser negativo')
    receipt = asegurar_recibo_orden(order)
    receipt.detalles.clear()
    if total:
        receipt.detalles.append(ReciboDetalle(
            descripcion='Servicios de taller',
            cantidad=1,
            precio_unitario=total,
            subtotal=total,
        ))
    order.subtotal = total
    order.total = total
    receipt.subtotal = total
    receipt.total = total
    receipt.descuento = Decimal('0.00')
