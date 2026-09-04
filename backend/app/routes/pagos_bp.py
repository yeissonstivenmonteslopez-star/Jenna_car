from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Pago, Recibo, Usuario, Cliente, OrdenTrabajo
from ..utils import payment_to_dict, notificacion_por_usuario
from ..services.security import jwt_required
import re
import secrets
from datetime import datetime as _datetime
from datetime import timezone as _timezone

pagos_bp = Blueprint('pagos', __name__)


@pagos_bp.get('/admin')
@jwt_required(roles=['admin'])
def admin_pagos():
    query = request.args.get('q', '').strip()
    referencia = request.args.get('referencia', '').strip()
    cliente = request.args.get('cliente', '').strip()
    estado = request.args.get('estado', '').strip()
    fecha = request.args.get('fecha', '').strip()
    pagos_query = Pago.query.join(Recibo).join(OrdenTrabajo).join(Cliente).join(Usuario)
    if query:
        pagos_query = pagos_query.filter(
            (Pago.referencia.ilike(f'%{query}%'))
            | (Usuario.nombre.ilike(f'%{query}%'))
            | (Usuario.apellido.ilike(f'%{query}%'))
            | (Usuario.email.ilike(f'%{query}%'))
        )
    if referencia:
        pagos_query = pagos_query.filter(Pago.referencia.ilike(f'%{referencia}%'))
    if cliente:
        pagos_query = pagos_query.filter(
            (Usuario.nombre.ilike(f'%{cliente}%'))
            | (Usuario.apellido.ilike(f'%{cliente}%'))
            | (Usuario.email.ilike(f'%{cliente}%'))
        )
    if estado:
        pagos_query = pagos_query.filter(Pago.estado.ilike(f'%{estado}%'))
    if fecha:
        pagos_query = pagos_query.filter(db.func.date(Pago.fecha_pago) == fecha)
    pagos = pagos_query.order_by(Pago.fecha_pago.desc(), Pago.id.desc()).all()
    return jsonify({'data': [payment_to_dict(payment) for payment in pagos]})


@pagos_bp.get('/admin/<int:pago_id>')
@jwt_required(roles=['admin'])
def admin_pago_detalle(pago_id: int):
    pago = db.session.get(Pago, pago_id)
    if not pago:
        return jsonify({'error': 'Pago no encontrado'}), 404
    return jsonify({'data': payment_to_dict(pago)})


@pagos_bp.post('')
@jwt_required()
def crear_pago_simulado():
    payload = request.get_json(silent=True) or {}
    recibo_id = payload.get('recibo_id')
    numero_nequi = str(payload.get('numero_nequi') or '').strip()

    if not recibo_id:
        return jsonify({'error': 'El recibo es obligatorio'}), 400
    if not re.fullmatch(r'3\d{9}', numero_nequi):
        return jsonify({'error': 'Ingresa un número de Nequi válido de 10 dígitos'}), 400

    usuario = request.current_user
    cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
    if not cliente:
        return jsonify({'error': 'No tienes un perfil de cliente asociado'}), 403

    recibo = Recibo.query.filter_by(id=int(recibo_id), cliente_id=cliente.id).first()
    if not recibo:
        return jsonify({'error': 'Recibo no encontrado'}), 404
    if recibo.estado == 'pagado':
        return jsonify({'error': 'Este recibo ya fue pagado'}), 409

    referencia = f'NEQUI-{secrets.token_hex(8).upper()}'
    numero_nequi_masked = numero_nequi[-4:] if len(numero_nequi) >= 4 else numero_nequi
    pago = Pago(
        recibo_id=recibo.id,
        usuario_id=usuario.id,
        monto=recibo.total,
        metodo_pago='nequi',
        numero_nequi=numero_nequi_masked,
        referencia=referencia,
        estado='completado',
        fecha_pago=_datetime.now(_timezone.utc),
    )
    db.session.add(pago)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Conflicto al registrar el pago. Inténtalo de nuevo.'}), 409

    recibo.estado = 'pagado'
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Error al actualizar el recibo'}), 409

    response = payment_to_dict(pago)
    response['mensaje'] = 'Pago simulado registrado correctamente. PAGO SIMULADO — NO ES UNA TRANSACCIÓN REAL'
    notificacion_por_usuario(
        usuario_id=usuario.id,
        titulo='Pago registrado',
        mensaje=f'El pago de ${float(recibo.total):.2f} ha sido registrado correctamente. Referencia: {referencia}.',
        tipo='pago',
        link=f'/recibos/{recibo.orden_id}',
    )
    return jsonify({'data': response}), 201


@pagos_bp.get('/<int:pago_id>')
@jwt_required()
def detalle_pago_usuario(pago_id: int):
    cliente = Cliente.query.filter_by(usuario_id=request.current_user.id).first()
    pago = db.session.query(Pago).join(Recibo).filter(
        Pago.id == pago_id, Recibo.cliente_id == (cliente.id if cliente else None)
    ).first()
    if not pago:
        return jsonify({'error': 'Pago no encontrado'}), 404

    return jsonify({'data': payment_to_dict(pago)})


@pagos_bp.get('/mis-pagos')
@jwt_required()
def mis_pagos():
    cliente = Cliente.query.filter_by(usuario_id=request.current_user.id).first()
    if not cliente:
        return jsonify({'error': 'No tienes un perfil de cliente asociado'}), 403
    pagos = Pago.query.join(Recibo).filter(Recibo.cliente_id == cliente.id).order_by(Pago.fecha_pago.desc(), Pago.id.desc()).all()
    return jsonify({'data': [payment_to_dict(payment) for payment in pagos]})
