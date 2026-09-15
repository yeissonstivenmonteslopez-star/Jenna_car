from flask import jsonify, request

from ..services import auth_s as auth_service


def google_login():
    token = (request.get_json(silent=True) or {}).get('id_token') or ''
    if not token:
        return jsonify({'error': 'Falta el token de Google.'}), 400
    data, error, status = auth_service.google_login(token)
    return (jsonify({'error': error}), status) if error else jsonify(data)


def register():
    data, error, status = auth_service.register(request.get_json(silent=True) or {})
    return (jsonify({'error': error}), status) if error else (jsonify(data), status or 200)


def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''
    data, error, status = auth_service.login(email, password)
    return (jsonify({'error': error}), status) if error else jsonify(data)


def current_user():
    return jsonify({'user': request.current_user.to_public_dict()})


def request_password_reset():
    email = ((request.get_json(silent=True) or {}).get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'Ingresa tu correo electrónico.'}), 400
    data, error, status = auth_service.request_password_reset(email)
    return (jsonify({'error': error}), status) if error else (jsonify(data), status)


def confirm_password_reset_route():
    payload = request.get_json(silent=True) or {}
    email = (payload.get('email') or '').strip().lower()
    code = str(payload.get('code') or '').strip()
    password = payload.get('password') or ''
    if not email or not code or not password:
        return jsonify({'error': 'Correo, código y nueva contraseña son obligatorios.'}), 400
    if len(password) < 8:
        return jsonify({'error': 'La contraseña debe tener al menos 8 caracteres.'}), 400
    data, error, status = auth_service.confirm_password_reset(email, code, password)
    return (jsonify({'error': error}), status) if error else jsonify(data)
