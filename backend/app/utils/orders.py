from datetime import datetime
from decimal import Decimal


def order_to_dict(order):
    if order and not order.recibo and order.id:
        try:
            asegurar_recibo_orden(order, do_commit=True)
        except Exception:
            from ..extensions import db
            db.session.rollback()

    recibo_data = None
    if order and order.recibo:
        recibo_data = {
            'id': order.recibo.id,
            'estado': order.recibo.estado,
            'subtotal': float(order.recibo.subtotal),
            'total': float(order.recibo.total),
        }

    return {
        'id': order.id,
        'cliente': {
            'id': order.cliente.id,
            'nombre': order.cliente.usuario.nombre,
            'apellido': order.cliente.usuario.apellido,
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
        'recibo': recibo_data,
        'servicios': [
            {
                'id': item.id,
                'servicio_id': item.servicio_id,
                'nombre': item.servicio.nombre,
                'cantidad': item.cantidad,
                'precio': float(item.precio),
                'subtotal': float(item.subtotal),
            }
            for item in order.ordenes_servicios
        ],
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
            cliente_id=orden.cliente_id,
            fecha_emision=datetime.now(),
            subtotal=subtotal,
            descuento=descuento,
            total=total,
            estado='pendiente',
        )
        db.session.add(recibo)
    else:
        recibo.cliente_id = orden.cliente_id
        recibo.subtotal = subtotal
        recibo.descuento = descuento
        recibo.total = total
    if do_commit:
        db.session.commit()
    return recibo


def apply_order_services(order, service_items):
    from ..models import OrdenServicio, Servicio
    from ..extensions import db

    order.ordenes_servicios.clear()
    subtotal = Decimal('0.00')
    for item in service_items or []:
        service = db.session.get(Servicio, item.get('servicio_id'))
        quantity = int(item.get('cantidad', 1))
        if not service or service.estado != 'activo' or quantity < 1:
            raise ValueError('Servicio o cantidad inválidos')
        price = Decimal(str(item.get('precio', service.precio)))
        line_total = price * quantity
        order.ordenes_servicios.append(OrdenServicio(
            servicio=service,
            cantidad=quantity,
            precio=price,
            subtotal=line_total,
        ))
        subtotal += line_total
    order.subtotal = subtotal
    order.total = subtotal
