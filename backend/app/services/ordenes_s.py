"""Work-order domain operations."""
from datetime import datetime, timezone
from ..extensions import db
from ..models import OrdenTrabajo
from ..repository import ordenes_r as order_repository
from ..utils.notifications import notificacion_por_usuario
from ..utils.orders import apply_order_services, asegurar_recibo_orden, order_to_dict

STATES = {'pendiente', 'en_diagnostico', 'en_reparacion', 'terminada', 'entregada', 'cancelada'}


def list_all():
    return [order_to_dict(order) for order in order_repository.list_all()]


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
        cliente=cliente,
        vehiculo=vehicle,
        fecha_ingreso=(
            datetime.fromisoformat(payload['fecha_ingreso'])
            if payload.get('fecha_ingreso')
            else datetime.now(timezone.utc)
        ),
        kilometraje=payload.get('kilometraje', 0),
        problema_reportado=payload['problema_reportado'],
        diagnostico=payload.get('diagnostico'),
        trabajo_realizado=payload.get('trabajo_realizado'),
        observaciones=payload.get('observaciones'),
        estado=state,
    )
    try:
        db.session.add(order)
        apply_order_services(order, payload.get('servicios'))
        db.session.flush()
        asegurar_recibo_orden(order, do_commit=False)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return None, 'Conflicto de integridad al crear la orden.', 409

    if order.total > 0:
        notificacion_por_usuario(
            cliente.usuario_id,
            f'Costo de tu orden #{order.id}',
            f'El costo estimado de tu orden es de ${float(order.total):.2f}. '
            'Puedes consultar el recibo y realizar el pago simulado desde Mis recibos.',
            tipo='pago',
            link='/mis-recibos',
        )
    return order_to_dict(order), None, 201


def update(order, payload):
    if 'vehiculo_id' in payload:
        vehicle = order_repository.get_vehicle(payload['vehiculo_id'])
        if not vehicle or vehicle.cliente_id != order.cliente_id:
            return None, 'Vehículo inválido para el cliente de la orden', 400
        order.vehiculo_id = vehicle.id

    for field in ['fecha_entrega', 'diagnostico', 'trabajo_realizado', 'observaciones', 'problema_reportado']:
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
        db.session.flush()
        asegurar_recibo_orden(order, do_commit=False)
        db.session.commit()
    except (ValueError, TypeError, ArithmeticError) as exc:
        db.session.rollback()
        return None, str(exc), 400
    except Exception:
        db.session.rollback()
        return None, 'Conflicto de integridad al actualizar la orden.', 409

    if 'servicios' in payload and order.total > 0:
        notificacion_por_usuario(
            order.cliente.usuario_id,
            f'Costo actualizado de tu orden #{order.id}',
            f'El costo de tu orden se actualizó a ${float(order.total):.2f}. '
            'Puedes consultar el recibo y realizar el pago simulado desde Mis recibos.',
            tipo='pago',
            link='/mis-recibos',
        )
    return order_to_dict(order), None, None


def delete(order):
    if order.recibo:
        return None, 'No se puede eliminar una orden con recibo', 409
    db.session.delete(order)
    db.session.commit()
    return {'message': 'Orden eliminada correctamente'}, None, None
