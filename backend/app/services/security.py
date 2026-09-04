"""JWT helpers shared by modular route blueprints."""

from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, jsonify, request

from ..extensions import db
from ..models import Usuario


def create_access_token(usuario):
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            'sub': str(usuario.id),
            'role': usuario.rol,
            'iat': now,
            'exp': now + timedelta(hours=1),
        },
        current_app.config['SECRET_KEY'],
        algorithm='HS256',
    )


def jwt_required(roles=None):
    def decorator(handler):
        @wraps(handler)
        def wrapped(*args, **kwargs):
            token = request.headers.get('Authorization', '').replace('Bearer ', '', 1).strip()
            if not token:
                token = request.args.get('token', '').strip()
            if not token:
                return jsonify({'error': 'Debes iniciar sesión para continuar'}), 401
            try:
                payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            except jwt.PyJWTError:
                return jsonify({'error': 'Token inválido o expirado'}), 401

            usuario = db.session.get(Usuario, payload.get('sub'))
            if not usuario or usuario.estado != 'activo':
                return jsonify({'error': 'Usuario no encontrado o inactivo'}), 401
            if roles and usuario.rol not in roles:
                return jsonify({'error': 'No tienes permisos para realizar esta acción'}), 403

            request.current_user = usuario
            return handler(*args, **kwargs)

        return wrapped
    return decorator
