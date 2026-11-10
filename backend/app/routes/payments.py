"""Compatibility routes. Settlement is exclusively handled by the signed webhook."""
from flask import Blueprint, jsonify, request
from ..auth.decorators import jwt_required
from ..services import pagos_s

payment_bp = Blueprint('payments', __name__)


@payment_bp.post('/create')
@jwt_required()
def create_payment():
    data, error, status = pagos_s.create(request.current_user, request.get_json(silent=True) or {})
    return (jsonify({'error': error}), status) if error else (jsonify({'data': data}), status)


@payment_bp.get('/historial')
@jwt_required()
def historial_pagos():
    data, error, status = pagos_s.list_for_user(request.current_user.id)
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})


@payment_bp.get('/<int:payment_id>')
@jwt_required()
def detalle_pago(payment_id):
    data, error, status = pagos_s.get_for_user(request.current_user.id, payment_id)
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})


@payment_bp.post('/<int:payment_id>/confirm')
@jwt_required()
def confirmar_pago(payment_id):
    return jsonify({'error': 'El pago solo se confirma mediante la notificación verificada de Mercado Pago'}), 409


@payment_bp.post('/webhook')
def legacy_webhook():
    return jsonify({'error': 'Usa /api/pagos/mercado-pago/webhook para Mercado Pago'}), 410
