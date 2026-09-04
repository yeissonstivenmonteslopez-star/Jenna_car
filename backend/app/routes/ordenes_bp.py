from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import OrdenTrabajo, Cliente, Vehiculo, Recibo, Pago, Usuario
from ..utils import order_to_dict, apply_order_services, notificacion_por_usuario, asegurar_recibo_orden, Decimal
from ..services.security import jwt_required
from decimal import Decimal as _Decimal

ordenes_bp = Blueprint('ordenes', __name__)


@ordenes_bp.get('')
@jwt_required(roles=['admin'])
def admin_ordenes():
    from ..models import OrdenTrabajo
    orders = OrdenTrabajo.query.order_by(OrdenTrabajo.created_at.desc(), OrdenTrabajo.id.desc()).all()
    return jsonify({'data': [order_to_dict(order) for order in orders]})


@ordenes_bp.post('')
@jwt_required(roles=['admin'])
def crear_orden_admin():
    payload = request.get_json(silent=True) or {}
    from ..models import Cliente as ClienteModel
    cliente = db.session.get(ClienteModel, payload.get('cliente_id'))
    from ..models import Vehiculo as VehiculoModel
    vehiculo = db.session.get(VehiculoModel, payload.get('vehiculo_id'))
    if not cliente or not vehiculo or vehiculo.cliente_id != cliente.id:
        return jsonify({'error': 'Cliente o vehículo inválidos'}), 400
    if not payload.get('problema_reportado'):
        return jsonify({'error': 'El problema reportado es obligatorio'}), 400
    estado = payload.get('estado', 'pendiente')
    estados = {'pendiente', 'en_diagnostico', 'en_reparacion', 'terminada', 'entregada', 'cancelada'}
    if estado not in estados:
        return jsonify({'error': 'Estado inválido'}), 400
    from datetime import datetime as _datetime
    from ..models import OrdenTrabajo as OTModel
    order = OTModel(
        cliente=cliente,
        vehiculo=vehiculo,
        fecha_ingreso=_datetime.fromisoformat(payload['fecha_ingreso']) if payload.get('fecha_ingreso') else _datetime.now(timezone.utc),
        kilometraje=payload.get('kilometraje', 0),
        problema_reportado=payload['problema_reportado'],
        diagnostico=payload.get('diagnostico'),
        trabajo_realizado=payload.get('trabajo_realizado'),
        observaciones=payload.get('observaciones'),
        estado=estado,
    )
    try:
        db.session.add(order)
        apply_order_services(order, payload.get('servicios'))
        db.session.flush()
        asegurar_recibo_orden(order, do_commit=False)
        db.session.commit()
    except Exception:
        from ..extensions import db as _db
        _db.session.rollback()
        return jsonify({'error': 'Conflicto de integridad al crear la orden.'}), 409
    if order.total > 0:
        from ..utils import notificacion_por_usuario
        notificacion_por_usuario(
            usuario_id=cliente.usuario_id,
            titulo=f'Costo de tu orden #{order.id}',
            mensaje=f'El costo estimado de tu orden es de ${float(order.total):.2f}. Puedes consultar el recibo y realizar el pago simulado desde Mis recibos.',
            tipo='pago',
            link='/mis-recibos',
        )
    return jsonify({'data': order_to_dict(order)}), 201


@ordenes_bp.get('/<int:orden_id>')
@jwt_required(roles=['admin'])
def obtener_orden_admin(orden_id):
    order = db.session.get(OrdenTrabajo, orden_id)
    if not order:
        return jsonify({'error': 'Orden no encontrada'}), 404
    return jsonify({'data': order_to_dict(order)})


@ordenes_bp.put('/<int:orden_id>')
@jwt_required(roles=['admin'])
def actualizar_orden_admin(orden_id):
    order = db.session.get(OrdenTrabajo, orden_id)
    if not order:
        return jsonify({'error': 'Orden no encontrada'}), 404
    payload = request.get_json(silent=True) or {}
    if 'vehiculo_id' in payload:
        vehicle = db.session.get(Vehiculo, payload['vehiculo_id'])
        if not vehicle or vehicle.cliente_id != order.cliente_id:
            return jsonify({'error': 'Vehículo inválido para el cliente de la orden'}), 400
        order.vehiculo_id = vehicle.id
    for field in ['fecha_entrega', 'diagnostico', 'trabajo_realizado', 'observaciones', 'problema_reportado']:
        if field in payload:
            try:
                value = datetime.fromisoformat(payload[field]) if field == 'fecha_entrega' and payload[field] else payload[field]
            except (TypeError, ValueError):
                return jsonify({'error': 'La fecha de entrega no es válida'}), 400
            setattr(order, field, value)
    if 'kilometraje' in payload:
        order.kilometraje = payload['kilometraje']
    if 'estado' in payload:
        states = {'pendiente', 'en_diagnostico', 'en_reparacion', 'terminada', 'entregada', 'cancelada'}
        if payload['estado'] not in states:
            return jsonify({'error': 'Estado inválido'}), 400
        previous = order.estado
        order.estado = payload['estado']
        if previous != order.estado:
            notificacion_por_usuario(order.cliente.usuario_id, f'Orden #{order.id} - Estado actualizado', f'El estado de tu orden de trabajo ha cambiado a "{order.estado}".', tipo='sistema', link=f'/ordenes/{order.id}', do_commit=False)
    try:
        if 'servicios' in payload:
            apply_order_services(order, payload['servicios'])
        db.session.flush()
        asegurar_recibo_orden(order, do_commit=False)
        db.session.commit()
    except (ValueError, TypeError, ArithmeticError) as exc:
        db.session.rollback()
        return jsonify({'error': str(exc)}), 400
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Conflicto de integridad al actualizar la orden.'}), 409
    if 'servicios' in payload and order.total > 0:
        notificacion_por_usuario(order.cliente.usuario_id, f'Costo actualizado de tu orden #{order.id}', f'El costo de tu orden se actualizó a ${float(order.total):.2f}. Puedes consultar el recibo y realizar el pago simulado desde Mis recibos.', tipo='pago', link='/mis-recibos')
    return jsonify({'data': order_to_dict(order)})


@ordenes_bp.delete('/<int:orden_id>')
@jwt_required(roles=['admin'])
def eliminar_orden_admin(orden_id):
    order = db.session.get(OrdenTrabajo, orden_id)
    if not order:
        return jsonify({'error': 'Orden no encontrada'}), 404
    if order.recibo:
        return jsonify({'error': 'No se puede eliminar una orden con recibo'}), 409
    db.session.delete(order)
    db.session.commit()
    return jsonify({'message': 'Orden eliminada correctamente'})
