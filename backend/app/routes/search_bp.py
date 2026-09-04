from flask import Blueprint, jsonify, request
from sqlalchemy import String

from ..extensions import db
from ..models import Cliente, Cita, OrdenTrabajo, Recibo, Usuario, Vehiculo
from ..services.security import jwt_required

search_bp = Blueprint('search', __name__)


@search_bp.get('')
@jwt_required(roles=['admin'])
def admin_search():
    query = request.args.get('q', '').strip()
    type_filter = request.args.get('type', '').strip()
    results = {}

    if type_filter in {'', 'cliente'}:
        clients = Cliente.query.join(Usuario).filter(
            (Usuario.nombre.ilike(f'%{query}%'))
            | (Cliente.documento.ilike(f'%{query}%'))
            | (Usuario.email.ilike(f'%{query}%'))
        ).all()
        results['clientes'] = [{
            'id': client.id,
            'nombre': client.usuario.nombre,
            'apellido': client.usuario.apellido,
            'documento': client.documento,
            'email': client.usuario.email,
            'telefono': client.usuario.telefono,
        } for client in clients]

    if type_filter in {'', 'vehiculo'}:
        vehicles = Vehiculo.query.filter(
            (Vehiculo.placa.ilike(f'%{query}%'))
            | (Vehiculo.marca.ilike(f'%{query}%'))
            | (Vehiculo.modelo.ilike(f'%{query}%'))
        ).all()
        results['vehiculos'] = [{
            'id': vehicle.id,
            'placa': vehicle.placa,
            'marca': vehicle.marca,
            'modelo': vehicle.modelo,
            'anio': vehicle.anio,
            'cliente_id': vehicle.cliente_id,
        } for vehicle in vehicles]

    if type_filter in {'', 'orden'}:
        orders = OrdenTrabajo.query.join(OrdenTrabajo.cliente).join(Cliente.usuario).join(OrdenTrabajo.vehiculo).filter(
            (OrdenTrabajo.id.cast(String).ilike(f'%{query}%'))
            | (Vehiculo.placa.ilike(f'%{query}%'))
            | (Usuario.nombre.ilike(f'%{query}%'))
            | (OrdenTrabajo.estado.ilike(f'%{query}%'))
        ).all()
        results['órdenes'] = [{
            'id': order.id,
            'cliente': f'{order.cliente.usuario.nombre} {order.cliente.usuario.apellido}',
            'vehiculo_placa': order.vehiculo.placa,
            'estado': order.estado,
        } for order in orders]

    if type_filter in {'', 'cita'}:
        appointments = Cita.query.join(Cliente).join(Usuario).filter(
            (Usuario.nombre.ilike(f'%{query}%'))
            | (Cita.estado.ilike(f'%{query}%'))
            | (Cita.fecha.cast(String).ilike(f'%{query}%'))
        ).all()
        results['citas'] = [{
            'id': appointment.id,
            'cliente': f'{appointment.cliente.usuario.nombre} {appointment.cliente.usuario.apellido}',
            'vehiculo_placa': appointment.vehiculo.placa,
            'fecha': str(appointment.fecha),
            'hora': str(appointment.hora),
            'estado': appointment.estado,
        } for appointment in appointments]

    if type_filter in {'', 'recibo'}:
        receipts = Recibo.query.join(OrdenTrabajo).join(Cliente).join(Usuario).filter(
            (OrdenTrabajo.id.cast(String).ilike(f'%{query}%'))
            | (Usuario.nombre.ilike(f'%{query}%'))
            | (Recibo.estado.ilike(f'%{query}%'))
        ).all()
        results['recibos'] = [{
            'id': receipt.id,
            'orden_id': receipt.orden_id,
            'cliente': f'{receipt.orden_trabajo.cliente.usuario.nombre} {receipt.orden_trabajo.cliente.usuario.apellido}',
            'estado': receipt.estado,
            'fecha_emision': receipt.fecha_emision.isoformat() if receipt.fecha_emision else None,
        } for receipt in receipts]

    return jsonify({'data': results})
