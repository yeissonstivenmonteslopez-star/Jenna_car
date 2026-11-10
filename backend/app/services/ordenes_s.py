"""Work-order domain operations."""
from datetime import datetime, timezone
from ..extensions import db
from ..models import OrdenTrabajo, Usuario, Vehiculo
from ..repository import ordenes_r as order_repository
from ..utils.notifications import notificacion_por_usuario
from ..utils.orders import apply_order_services, asegurar_recibo_orden, order_to_dict, set_order_amount

STATES = {'pendiente', 'en_diagnostico', 'en_reparacion', 'terminada', 'entregada', 'cancelada'}


def list_all():
    return [order_to_dict(order) for order in order_repository.list_all()]


def list_for_client(user_id):
    orders = (
        OrdenTrabajo.query
        .join(OrdenTrabajo.vehiculo)
        .filter(Vehiculo.usuario_id == user_id)
        .order_by(OrdenTrabajo.created_at.desc(), OrdenTrabajo.id.desc())
        .all()
    )
    return [{
        'id': order.id,
        'fecha_ingreso': order.fecha_ingreso.isoformat() if order.fecha_ingreso else None,
        'problema_reportado': order.problema_reportado,
        'estado': order.estado,
        'estado_aprobacion': order.estado_aprobacion,
        'vehiculo': {
            'marca': order.vehiculo.marca,
            'modelo': order.vehiculo.modelo,
            'placa': order.vehiculo.placa,
        },
        'total': float(order.total or 0),
        'recibo': {
            'id': order.recibo.id,
            'estado': order.recibo.estado,
            'enviado_cliente': order.recibo.enviado_cliente,
        } if order.recibo else None,
        'servicios': [{
            'descripcion': item.descripcion,
            'cantidad': item.cantidad,
            'precio_unitario': float(item.precio_unitario),
            'subtotal': float(item.subtotal),
        } for item in (order.recibo.detalles if order.recibo else [])],
        'trabajos': [{
            'id': work.id,
            'descripcion': work.descripcion,
            'estado': work.estado,
            'cantidad': work.cantidad,
            'subtotal': float(work.subtotal),
            'diagnostico': {
                'descripcion': work.diagnostico.descripcion,
                'observaciones': work.diagnostico.observaciones,
                'solucion_recomendada': work.diagnostico.solucion_recomendada,
            } if work.diagnostico else None,
            'imagenes': [{
                'id': image.id,
                'descripcion': image.descripcion,
                'created_at': image.created_at.isoformat() if image.created_at else None,
            } for image in work.imagenes],
        } for work in order.trabajos],
    } for order in orders]


def get(order_id):
    return order_repository.get(order_id)


def create(payload):
    cliente = order_repository.get_customer(payload.get('cliente_id'))
    vehicle = order_repository.get_vehicle(payload.get('vehiculo_id'))
    if not cliente or not vehicle or vehicle.cliente_id != cliente.id:
        return None, 'Cliente o vehículo inválidos', 400
    if not payload.get('problema_reportado'):
        return None, 'El problema reportado es obligatorio', 400

    state = payload.get('estado', 'pendiente')
    if state not in STATES:
        return None, 'Estado inválido', 400

    order = OrdenTrabajo(
        vehiculo=vehicle,
        fecha_ingreso=(
            datetime.fromisoformat(payload['fecha_ingreso'])
            if payload.get('fecha_ingreso')
            else datetime.now(timezone.utc)
        ),
        kilometraje=payload.get('kilometraje', 0),
        problema_reportado=payload['problema_reportado'],
        observaciones=payload.get('observaciones'),
        estado=state,
    )
    try:
        db.session.add(order)
        db.session.flush()
        asegurar_recibo_orden(order, do_commit=False)
        if 'servicios' in payload:
            apply_order_services(order, payload.get('servicios'))
        elif 'total' in payload:
            set_order_amount(order, payload['total'])
        db.session.commit()
    except Exception:
        db.session.rollback()
        return None, 'Conflicto de integridad al crear la orden.', 409

    return order_to_dict(order), None, 201


def _quote_signature(order):
    receipt = order.recibo
    details = tuple(sorted(
        (item.descripcion, item.cantidad, str(item.precio_unitario), str(item.subtotal))
        for item in (receipt.detalles if receipt else [])
    ))
    return (str(order.subtotal), str(order.total), details)


def update(order, payload):
    previous_quote = _quote_signature(order)
    if 'vehiculo_id' in payload:
        vehicle = order_repository.get_vehicle(payload['vehiculo_id'])
        if not vehicle or vehicle.cliente_id != order.cliente_id:
            return None, 'Vehículo inválido para el cliente de la orden', 400
        order.vehiculo_id = vehicle.id

    for field in ['fecha_entrega', 'observaciones', 'problema_reportado']:
        if field in payload:
            try:
                value = (
                    datetime.fromisoformat(payload[field])
                    if field == 'fecha_entrega' and payload[field]
                    else payload[field]
                )
            except (TypeError, ValueError):
                return None, 'La fecha de entrega no es válida', 400
            setattr(order, field, value)

    if 'kilometraje' in payload:
        order.kilometraje = payload['kilometraje']

    if 'estado' in payload:
        if payload['estado'] not in STATES:
            return None, 'Estado inválido', 400
        previous = order.estado
        order.estado = payload['estado']
        if previous != order.estado:
            notificacion_por_usuario(
                order.cliente.usuario_id,
                f'Orden #{order.id} - Estado actualizado',
                f'El estado de tu orden de trabajo ha cambiado a "{order.estado}".',
                tipo='sistema',
                link=f'/ordenes/{order.id}',
                do_commit=False,
            )

    try:
        if 'servicios' in payload:
            apply_order_services(order, payload['servicios'])
        elif 'total' in payload:
            set_order_amount(order, payload['total'])
        db.session.flush()
        asegurar_recibo_orden(order, do_commit=False)
        quote_changed = previous_quote != _quote_signature(order)
        if quote_changed:
            if order.recibo and order.recibo.estado == 'pagado':
                db.session.rollback()
                return None, 'No se puede cambiar una orden cuyo recibo ya fue pagado', 409
            order.estado_aprobacion = 'pendiente'
            if order.recibo:
                order.recibo.enviado_cliente = False
        db.session.commit()
    except (ValueError, TypeError, ArithmeticError) as exc:
        db.session.rollback()
        return None, str(exc), 400
    except Exception:
        db.session.rollback()
        return None, 'Conflicto de integridad al actualizar la orden.', 409

    if quote_changed and order.total > 0:
        notificacion_por_usuario(
            order.cliente.usuario_id,
            f'Cotización actualizada para la orden #{order.id}',
            f'El total propuesto es ${float(order.total):.2f}. Revisa los detalles y aprueba o rechaza el trabajo.',
            tipo='diagnostico',
            link='/mis-reparaciones',
        )
    return order_to_dict(order), None, None


def approve_by_client(user, order_id, decision, comentario=''):
    order = db.session.get(OrdenTrabajo, order_id)
    if not order or not order.vehiculo or order.vehiculo.usuario_id != user.id:
        return None, 'Orden no encontrada', 404
    if decision not in {'aprobado', 'rechazado'}:
        return None, 'La decisión debe ser aprobar o rechazar', 400
    if order.estado in {'cancelada', 'entregada'}:
        return None, 'La orden ya no admite decisiones de aprobación', 409
    if order.recibo and order.recibo.enviado_cliente:
        return None, 'La cotización ya fue enviada como recibo', 409
    if not order.total or order.total <= 0 or not order.recibo or not order.recibo.detalles:
        return None, 'El taller aún no ha registrado una cotización para esta orden', 409
    if not any(work.diagnostico for work in order.trabajos):
        return None, 'El mecánico debe registrar el diagnóstico antes de solicitar aprobación', 409
    if order.estado_aprobacion == 'aprobado':
        return None, 'Esta cotización ya fue aprobada', 409

    order.estado_aprobacion = decision
    db.session.commit()

    comentario = comentario.strip() if isinstance(comentario, str) else ''
    admins = Usuario.query.filter_by(rol='admin', estado='activo').all()
    for admin in admins:
        notificacion_por_usuario(
            admin.id,
            f'Cotización #{order.id} {decision} por el cliente',
            f'{user.nombre} {user.apellido} respondió a la cotización de ${float(order.total):.2f}.'
            + (f' Comentario: {comentario[:500]}' if comentario else ''),
            tipo='diagnostico',
            link='/admin/orders',
        )
    return {'id': order.id, 'estado_aprobacion': order.estado_aprobacion}, None, None


def send_receipt(order_id):
    order = db.session.get(OrdenTrabajo, order_id)
    if not order:
        return None, 'Orden no encontrada', 404
    if order.estado in {'cancelada', 'entregada'}:
        return None, 'No se puede enviar el recibo de una orden cerrada', 409
    if order.estado_aprobacion != 'aprobado':
        return None, 'El cliente debe aprobar la cotización antes de enviar el recibo', 409
    receipt = asegurar_recibo_orden(order)
    if not receipt or receipt.total <= 0:
        return None, 'La orden debe tener un total mayor que cero', 409
    if receipt.estado != 'pendiente':
        return None, 'El recibo ya no está pendiente de pago', 409
    if receipt.enviado_cliente:
        return None, 'El recibo ya fue enviado al cliente', 409

    receipt.enviado_cliente = True
    db.session.commit()
    notificacion_por_usuario(
        order.vehiculo.usuario_id,
        f'Recibo disponible para la orden #{order.id}',
        f'Administración envió el recibo de tu reparación por ${float(receipt.total):.2f}. Ya puedes revisarlo y pagarlo.',
        tipo='pago',
        link='/mis-recibos',
    )
    return {'orden_id': order.id, 'recibo_id': receipt.id, 'enviado_cliente': True}, None, None


def delete(order):
    if order.recibo:
        return None, 'No se puede eliminar una orden con recibo', 409
    db.session.delete(order)
    db.session.commit()
    return {'message': 'Orden eliminada correctamente'}, None, None
