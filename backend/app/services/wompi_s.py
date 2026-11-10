"""Wompi payment gateway integration for Colombia PSE payments."""
import os
import json
import hmac
import hashlib
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone
from flask import current_app


# --- Configuración Wompi ---
WOMPI_PUBLIC_KEY = os.getenv('WOMPI_PUBLIC_KEY', '')  # Llave pública para frontend
WOMPI_PRIVATE_KEY = os.getenv('WOMPI_PRIVATE_KEY', '')  # Llave privada (nunca en frontend)
WOMPI_WEBHOOK_SECRET = os.getenv('WOMPI_WEBHOOK_SECRET', '')  # Secreto para validar webhooks
WOMPI_API_BASE = os.getenv('WOMPI_API_BASE', 'https://api.wompi.co/v1')


def get_headers():
    """Headers necesarios para las llamadas a la API Wompi."""
    return {
        'Authorization': f'Bearer {WOMPI_PRIVATE_KEY}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }


def create_payment(user, receipt, monto, metodo_pago):
    """
    Crear una transacción en Wompi.
    Retorna (resultado, error, status_code).
    """
    # Datos base de la transacción
    payload = {
        'amount': int(monto * 100),  # Wompi trabaja en centavos
        'currency': 'COP',
        'customer': {
            'email': receipt.usuario.email,
            'name': f"{receipt.usuario.nombre} {receipt.usuario.apellido}",
        },
        'payment_methods': {
            'pse': True,
            'card': metodo_pago == 'tarjeta',
        },
        'reference': f'jenna_car_{receipt.orden_trabajo.id}_{receipt.id}_{datetime.now().timestamp()}',
        'success_url': os.getenv('WOMPI_SUCCESS_URL', 'http://localhost:5173/pago-exitoso'),
        'fail_url': os.getenv('WOMPI_FAIL_URL', 'http://localhost:5173/pago-fallido'),
        'pending_url': os.getenv('WOMPI_PENDING_URL', 'http://localhost:5173/pago-pendiente'),
    }

    url = f'{WOMPI_API_BASE}/payments'
    json_payload = json.dumps(payload).encode('utf-8')

    req = urllib.request.Request(
        url,
        data=json_payload,
        headers={**get_headers(), 'Content-Type': 'application/json'},
        method='POST'
    )

    try:
        with urllib.request.urlopen(req) as response:
            if response.status != 201:
                body = response.read().decode('utf-8')
                try:
                    error_data = json.loads(body)
                except Exception:
                    error_data = {'message': body}
                return None, f'Error Wompi: {response.status} - {error_data}', response.status
            return json.loads(response.read().decode('utf-8')), None, 201
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        current_app.logger.error(f'Error HTTP Wompi: {e.code} - {body}')
        return None, f'Error Wompi: {e.code}', e.code
    except urllib.error.URLError as e:
        current_app.logger.error(f'Error de conexión Wompi: {e.reason}')
        return None, 'Error de conexión con la pasarela de pago', 503
    except Exception as e:
        current_app.logger.error(f'Error inesperado Wompi: {e}')
        return None, 'Error interno al procesar el pago', 500


def validate_webhook_signature(payload_dict, signature):
    """
    Validar la firma del webhook de Wompi.
    Wompi envía un header X-Wompi-Signature con un hash HMAC-SHA256.
    """
    if not WOMPI_WEBHOOK_SECRET:
        current_app.logger.warning('WOMPI_WEBHOOK_SECRET no configurado, saltando validación')
        return True, None  # En modo dev sin secret, permitir

    # El cuerpo raw de la petición
    raw_body = json.dumps(payload_dict, separators=(',', ':')) if isinstance(payload_dict, dict) else str(payload_dict)

    # Calcular HMAC-SHA256
    mac = hmac.new(
        WOMPI_WEBHOOK_SECRET.encode('utf-8'),
        raw_body.encode('utf-8'),
        hashlib.sha256
    )
    expected_signature = mac.hexdigest()

    # Comparar firmas (timing-safe)
    is_valid = hmac.compare_digest(expected_signature, signature)
    return is_valid, None if is_valid else 'Firma de webhook inválida'


def get_payment_status(reference):
    """Consultar estado actual de una transacción en Wompi."""
    if not reference: return None, 'Referencia inválida', 400

    url = f'{WOMPI_API_BASE}/payments/{reference}'
    req = urllib.request.Request(url, headers=get_headers(), method='GET')

    try:
        with urllib.request.urlopen(req) as response:
            if response.status != 200:
                body = response.read().decode('utf-8')
                return None, f'Error Wompi: {response.status} - {body}', response.status
            return json.loads(response.read().decode('utf-8')), None, 200
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        current_app.logger.error(f'Error Wompi status: {e.code} - {body}')
        return None, f'Error Wompi: {e.code}', e.code
    except urllib.error.URLError as e:
        current_app.logger.error(f'Error de conexión Wompi status: {e.reason}')
        return None, 'Error de conexión', 503
    except Exception as e:
        current_app.logger.error(f'Error Wompi status unexpected: {e}')
        return None, 'Error interno', 500


def parse_webhook_data(data):
    """
    Parsear los datos que Wompi envía en el webhook.
    Retorna información relevante del evento.
    """
    if isinstance(data, str): data = json.loads(data)

    event = data.get('event', '')
    payment = data.get('payment', {}) or {}

    return {
        'event': event,
        'payment_id': payment.get('id'),
        'reference': payment.get('reference'),
        'status': payment.get('status'),
        'amount': payment.get('amount', 0) / 100,  # de centavos a pesos
        'currency': payment.get('currency', 'COP'),
        'paid_at': payment.get('paid_at'),
        'method': payment.get('payment_method', {}).get('type', ''),
    }
