"""Local payment demonstration and verified Mercado Pago Checkout Pro."""
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import hmac
import json
import os
import secrets
import urllib.error
import urllib.request
from types import SimpleNamespace
from flask import current_app
from ..extensions import db
from ..models import OrdenTrabajo, Pago, Recibo, Usuario, Vehiculo
from ..utils.payments import payment_to_dict


def simulation_enabled():
    return os.getenv('PAYMENTS_SIMULATED', 'false').lower() in {'1', 'true', 'yes'}


def payment_query():
    # Local simulation also works before adding the provider tracking columns.
    from sqlalchemy.orm import defer
    query = Pago.query
    if simulation_enabled():
        query = query.options(defer(Pago.mercado_pago_payment_id), defer(Pago.mercado_pago_status), defer(Pago.mercado_pago_reference))
    return query


def create_simulated(user, receipt_id):
    receipt = db.session.get(Recibo, receipt_id, with_for_update=True)
    if not receipt or not receipt.orden_trabajo or not receipt.orden_trabajo.vehiculo or receipt.orden_trabajo.vehiculo.usuario_id != user.id:
        db.session.rollback()
        return None, 'Recibo no encontrado', 404
    if receipt.estado != 'pendiente':
        db.session.rollback()
        return None, 'El recibo no está pendiente de pago', 409
    if receipt.total <= 0:
        db.session.rollback()
        return None, 'El recibo debe tener un total mayor que cero', 400
    reference = f'SIM-{secrets.token_hex(12).upper()}'
    now = datetime.now(timezone.utc)
    values = dict(recibo_id=receipt.id, usuario_id=user.id, monto=receipt.total,
                  metodo_pago='otro', referencia=reference, estado='completado', fecha_pago=now)
    try:
        # Use the original schema: simulation needs no Mercado Pago migration.
        result = db.session.execute(db.text(
            'INSERT INTO pagos (recibo_id, usuario_id, monto, metodo_pago, referencia, estado, fecha_pago) '
            'VALUES (:recibo_id, :usuario_id, :monto, :metodo_pago, :referencia, :estado, :fecha_pago)'
        ), values)
        data = payment_to_dict(SimpleNamespace(id=result.lastrowid, recibo=receipt, **values))
        receipt.estado = 'pagado'
        data['recibo']['estado'] = 'pagado'
        db.session.commit()
    except Exception:
        db.session.rollback()
        return None, 'No se pudo registrar el pago simulado', 409
    data['mensaje'] = 'Pago simulado registrado. No se ha cobrado dinero real.'
    return data, None, 201


def mp_api(path, method='GET', body=None):
    token = os.getenv('MERCADOPAGO_ACCESS_TOKEN', '')
    if not token:
        return None, 'Mercado Pago no está configurado', 503
    req = urllib.request.Request(
        f'https://api.mercadopago.com{path}',
        data=json.dumps(body).encode('utf-8') if body is not None else None,
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode('utf-8')), None, response.status
    except (urllib.error.URLError, OSError, ValueError):
        current_app.logger.error('No se pudo completar la consulta a Mercado Pago')
        return None, 'No se pudo conectar con Mercado Pago', 502


def admin_list(filters):
    query, reference, client, state, date = (filters.get(key, '') for key in ('q', 'referencia', 'cliente', 'estado', 'fecha'))
    base = payment_query().join(Pago.recibo).join(Recibo.orden_trabajo).join(OrdenTrabajo.vehiculo).join(Vehiculo.cliente)
    if query: base = base.filter((Pago.referencia.ilike(f'%{query}%')) | (Usuario.nombre.ilike(f'%{query}%')) | (Usuario.apellido.ilike(f'%{query}%')) | (Usuario.email.ilike(f'%{query}%')))
    if reference: base = base.filter(Pago.referencia.ilike(f'%{reference}%'))
    if client: base = base.filter((Usuario.nombre.ilike(f'%{client}%')) | (Usuario.apellido.ilike(f'%{client}%')) | (Usuario.email.ilike(f'%{client}%')))
    if state: base = base.filter(Pago.estado.ilike(f'%{state}%'))
    if date: base = base.filter(db.func.date(Pago.fecha_pago) == date)
    return [payment_to_dict(item) for item in base.order_by(Pago.fecha_pago.desc(), Pago.id.desc()).all()]


def get(payment_id):
    return payment_query().filter(Pago.id == payment_id).first()


def create(user, payload):
    if not isinstance(payload, dict):
        return None, 'Datos de pago inválidos', 400
    try:
        receipt_id = int(str(payload.get('recibo_id', '')))
        if receipt_id <= 0: raise ValueError()
    except (TypeError, ValueError):
        return None, 'El recibo debe ser un identificador válido', 400
    if simulation_enabled():
        return create_simulated(user, receipt_id)
    # Fail before accessing persistence if the real integration is not configured.
    webhook_url = os.getenv('MERCADOPAGO_WEBHOOK_URL', '')
    frontend_url = os.getenv('MERCADOPAGO_RETURN_URL', '')
    if not (os.getenv('MERCADOPAGO_ACCESS_TOKEN') and os.getenv('MERCADOPAGO_WEBHOOK_SECRET') and webhook_url.startswith('https://') and frontend_url.startswith('https://')):
        return None, 'Configura las credenciales, el webhook HTTPS y la URL de retorno de Mercado Pago', 503
    receipt = db.session.get(Recibo, receipt_id)
    if not receipt or not receipt.orden_trabajo or not receipt.orden_trabajo.vehiculo or receipt.orden_trabajo.vehiculo.usuario_id != user.id:
        return None, 'Recibo no encontrado', 404
    if receipt.estado != 'pendiente':
        return None, 'El recibo no está pendiente de pago', 409
    if receipt.total <= 0:
        return None, 'El recibo debe tener un total mayor que cero', 400
    reference = f'MP-{receipt.id}-{secrets.token_hex(12)}'
    payment = Pago(recibo_id=receipt.id, usuario_id=user.id, monto=receipt.total,
                   metodo_pago='mercado_pago', referencia=reference,
                   mercado_pago_reference=reference, mercado_pago_status='pending',
                   estado='pendiente', fecha_pago=datetime.now(timezone.utc))
    # Persist the reference before the provider can send a notification.
    db.session.add(payment)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return None, 'No se pudo registrar el intento de pago', 409
    result, error, status = mp_api('/checkout/preferences', 'POST', {
        'items': [{'id': str(receipt.id), 'title': f'Recibo #{receipt.id} - Jenna Car',
                   'quantity': 1, 'currency_id': 'COP', 'unit_price': float(receipt.total)}],
        'payer': {'email': user.email},
        'external_reference': reference,
        'back_urls': {'success': frontend_url, 'failure': frontend_url, 'pending': frontend_url},
        'auto_return': 'approved',
        'notification_url': webhook_url,
    })
    if error:
        return None, error, status
    checkout_url = result.get('init_point')
    if not checkout_url or not checkout_url.startswith('https://'):
        return None, 'Mercado Pago no devolvió un enlace de pago válido', 502
    data = payment_to_dict(payment)
    data.update(url_redireccion=checkout_url, mensaje='Continúa en Mercado Pago para completar el pago.')
    return data, None, 201


def get_for_user(user_id, payment_id):
    payment = (payment_query().join(Pago.recibo).join(Recibo.orden_trabajo)
               .join(OrdenTrabajo.vehiculo).filter(Pago.id == payment_id, Vehiculo.usuario_id == user_id).first())
    return (payment_to_dict(payment), None, None) if payment else (None, 'Pago no encontrado', 404)


def list_for_user(user_id):
    payments = (payment_query().join(Pago.recibo).join(Recibo.orden_trabajo).join(OrdenTrabajo.vehiculo)
                .filter(Vehiculo.usuario_id == user_id).order_by(Pago.fecha_pago.desc(), Pago.id.desc()).all())
    return [payment_to_dict(item) for item in payments], None, None


def validate_mp_webhook_signature(data_id, signature, request_id):
    secret = os.getenv('MERCADOPAGO_WEBHOOK_SECRET', '')
    if not secret or not data_id or not request_id or not signature:
        return False
    try:
        parts = dict(part.strip().split('=', 1) for part in signature.split(','))
        timestamp, provided = parts['ts'], parts['v1']
        if not timestamp.isdigit(): return False
    except (ValueError, KeyError):
        return False
    manifest = f'id:{str(data_id).lower()};request-id:{request_id};ts:{timestamp};'
    expected = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, provided)


def process_webhook(data_id):
    if not str(data_id).isdigit():
        return None, 'Identificador de pago inválido', 400
    result, error, status = mp_api(f'/v1/payments/{data_id}')
    if error: return None, error, status
    reference = result.get('external_reference')
    if not reference:
        return None, 'Referencia no encontrada', 400
    payment = Pago.query.filter_by(mercado_pago_reference=reference).with_for_update().first()
    if not payment:
        return None, 'Pago no encontrado', 404
    try:
        amount = Decimal(str(result.get('transaction_amount', '')))
        valid_amount = amount.is_finite() and amount == Decimal(str(payment.monto))
    except (InvalidOperation, ValueError):
        valid_amount = False
    if str(result.get('id')) != str(data_id) or not valid_amount or result.get('currency_id') != 'COP':
        db.session.rollback()
        return None, 'El pago no coincide con el recibo', 400
    provider_status = result.get('status')
    if payment.estado == 'completado' and str(payment.mercado_pago_payment_id) != str(data_id):
        db.session.rollback()
        return None, 'El intento ya fue confirmado con otro pago', 409
    # A completed attempt cannot be downgraded by delayed/replayed notifications.
    if payment.estado == 'completado' and provider_status not in {'approved', 'refunded', 'charged_back'}:
        db.session.rollback()
        return {'received': True}, None, 200
    payment.mercado_pago_payment_id = str(data_id)
    payment.mercado_pago_status = provider_status
    receipt = db.session.get(Recibo, payment.recibo_id)
    if provider_status == 'approved':
        payment.estado = 'completado'
        if result.get('date_approved'):
            try:
                payment.fecha_pago = datetime.fromisoformat(result['date_approved'].replace('Z', '+00:00'))
            except (TypeError, ValueError):
                payment.fecha_pago = datetime.now(timezone.utc)
        receipt.estado = 'pagado'
    elif provider_status in {'rejected', 'cancelled', 'refunded', 'charged_back'}:
        payment.estado = 'anulado'
        if provider_status in {'refunded', 'charged_back'}:
            # Another approved attempt can still cover this receipt.
            other = Pago.query.filter(Pago.recibo_id == payment.recibo_id, Pago.id != payment.id, Pago.estado == 'completado').first()
            if not other: receipt.estado = 'pendiente'
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return None, 'No se pudo actualizar el estado del pago', 409
    return {'received': True}, None, 200
