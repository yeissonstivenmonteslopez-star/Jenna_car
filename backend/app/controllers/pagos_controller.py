from flask import jsonify, request

from ..services import pagos_s as payment_service


def admin_pagos():
    filters = {key: request.args.get(key, '').strip() for key in ('q', 'referencia', 'cliente', 'estado', 'fecha')}
    return jsonify({'data': payment_service.admin_list(filters)})


def admin_pago_detalle(pago_id):
    pago = payment_service.get(pago_id)
    if not pago:
        return jsonify({'error': 'Pago no encontrado'}), 404
    return jsonify({'data': payment_service.payment_to_dict(pago)})


def crear_pago_simulado():
    data, error, status = payment_service.create(request.current_user, request.get_json(silent=True) or {})
    return (jsonify({'error': error}), status) if error else (jsonify({'data': data}), status)


def detalle_pago_usuario(pago_id):
    data, error, status = payment_service.get_for_user(request.current_user.id, pago_id)
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})


def mis_pagos():
    data, error, status = payment_service.list_for_user(request.current_user.id)
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})
