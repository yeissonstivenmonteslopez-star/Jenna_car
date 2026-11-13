from flask import Blueprint, request, jsonify
from ..auth.decorators import jwt_required
from ..controllers import pagos_controller
from ..services import pagos_s

pagos_bp = Blueprint('pagos', __name__)


@pagos_bp.post('/simulados')
@jwt_required(roles=['usuario'])
def simulated_checkout():
    data, error, status = pagos_s.simulate_checkout(request.current_user, request.get_json(silent=True) or {})
    return (jsonify({'error': error}), status) if error else (jsonify({'data': data}), status)


@pagos_bp.get('/config')
@jwt_required()
def payment_config():
    return jsonify({'data': {'simulacion': pagos_s.simulation_enabled()}})


@pagos_bp.get('/admin')
@jwt_required(roles=['admin'])
def admin_pagos():
    return pagos_controller.admin_pagos()


@pagos_bp.get('/admin/<int:pago_id>')
@jwt_required(roles=['admin'])
def admin_pago_detalle(pago_id):
    return pagos_controller.admin_pago_detalle(pago_id)


@pagos_bp.get('/<int:pago_id>')
@jwt_required()
def detalle_pago_usuario(pago_id):
    return pagos_controller.detalle_pago_usuario(pago_id)


@pagos_bp.get('/mis-pagos')
@jwt_required()
def mis_pagos():
    return pagos_controller.mis_pagos()


@pagos_bp.post('')
@pagos_bp.post('/mercado-pago/create')
@jwt_required()
def crear_pago_mercado_pago():
    data, error, status = pagos_s.create(request.current_user, request.get_json(silent=True) or {})
    return (jsonify({'error': error}), status) if error else (jsonify({'data': data}), status)


@pagos_bp.post('/mercado-pago/webhook')
def mercado_pago_webhook():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({'error': 'Notificación inválida'}), 400
    # The signed identifier comes from the query string, per Mercado Pago.
    data_id = request.args.get('data.id', '')
    if not pagos_s.validate_mp_webhook_signature(data_id, request.headers.get('X-Signature', ''), request.headers.get('X-Request-Id', '')):
        return jsonify({'error': 'Firma inválida'}), 400
    if payload.get('type') != 'payment':
        return jsonify({'received': True}), 200
    body_data = payload.get('data')
    if not isinstance(body_data, dict) or str(body_data.get('id', '')).lower() != data_id.lower():
        return jsonify({'error': 'Identificador inconsistente'}), 400
    data, error, status = pagos_s.process_webhook(data_id)
    return (jsonify({'error': error}), status) if error else (jsonify({'data': data}), status)
