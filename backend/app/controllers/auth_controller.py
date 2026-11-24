from flask import current_app, jsonify, request

from ..services import auth_s as auth_service
from ..services.reset_limits import allow_login_attempt, clear_login_failures, record_login_failure


def _request_origin():
    origin = request.remote_addr
    if current_app.config.get('TRUST_RESET_PROXY_IP'):
        origin = request.headers.get('X-Real-IP') or origin
    return origin or 'unknown'


def google_login():
    token = (request.get_json(silent=True) or {}).get('id_token') or ''
    if not isinstance(token, str) or not token or len(token) > 8192:
        return jsonify({'error': 'Falta el token de Google.'}), 400
    data, error, status = auth_service.google_login(token)
    return (jsonify({'error': error}), status) if error else jsonify(data)


def register():
    payload = request.get_json(silent=True) or {}
    if not isinstance(payload, dict):
        return jsonify({'error': 'Datos de registro inválidos.'}), 400
    data, error, status = auth_service.register(payload)
    return (jsonify({'error': error}), status) if error else (jsonify(data), status or 200)


def login():
    payload = request.get_json(silent=True) or {}
    raw_email = payload.get('email') or ''
    password = payload.get('password') or ''
    if not isinstance(raw_email, str) or not isinstance(password, str):
        return jsonify({'error': 'Credenciales incorrectas'}), 401
    email = raw_email.strip().lower()
    if not email or len(email) > 150 or not 8 <= len(password) <= 128:
        return jsonify({'error': 'Credenciales incorrectas'}), 401
    origin = _request_origin()
    if not allow_login_attempt(email, origin):
        return jsonify({'error': 'Demasiados intentos. Inténtalo de nuevo en unos minutos.'}), 429
    data, error, status = auth_service.login(email, password)
    if error:
        record_login_failure(email, origin)
    else:
        clear_login_failures(email)
    return (jsonify({'error': error}), status) if error else jsonify(data)


def current_user():
    return jsonify({'user': request.current_user.to_public_dict()})


def request_password_reset():
    raw_email = (request.get_json(silent=True) or {}).get('email') or ''
    if not isinstance(raw_email, str) or len(raw_email) > 150:
        return jsonify({'error': 'Ingresa un correo electrónico válido.'}), 400
    email = raw_email.strip().lower()
    if not email:
        return jsonify({'error': 'Ingresa tu correo electrónico.'}), 400
    data, error, status = auth_service.request_password_reset(email, _request_origin())
    return (jsonify({'error': error}), status) if error else (jsonify(data), status)


def verify_password_reset_code():
    payload = request.get_json(silent=True) or {}
    raw_email = payload.get('email') or ''
    if not isinstance(raw_email, str):
        return jsonify({'error': 'Correo y código son obligatorios.'}), 400
    email = raw_email.strip().lower()
    code = str(payload.get('code') or '').strip()
    if not email or not code:
        return jsonify({'error': 'Correo y código son obligatorios.'}), 400
    data, error, status = auth_service.verify_password_reset_code(email, code)
    return (jsonify({'error': error}), status) if error else jsonify(data)


def confirm_password_reset_route():
    payload = request.get_json(silent=True) or {}
    raw_email = payload.get('email') or ''
    if not isinstance(raw_email, str):
        return jsonify({'error': 'Correo, código y nueva contraseña son obligatorios.'}), 400
    email = raw_email.strip().lower()
    code = str(payload.get('code') or '').strip()
    password = payload.get('password') or ''
    if not email or not code or not password:
        return jsonify({'error': 'Correo, código y nueva contraseña son obligatorios.'}), 400
    if not isinstance(password, str) or not 8 <= len(password) <= 128:
        return jsonify({'error': 'La contraseña debe tener entre 8 y 128 caracteres.'}), 400
    data, error, status = auth_service.confirm_password_reset(email, code, password)
    return (jsonify({'error': error}), status) if error else jsonify(data)
