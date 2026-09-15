"""Decoradores HTTP para proteger endpoints."""
from functools import wraps
import jwt
from flask import jsonify, request
from ..repository.usuarios_r import get as get_user
from .jwt import decode_token
from .permissions import has_role, is_active


def jwt_required(roles=None):
    def decorator(handler):
        @wraps(handler)
        def wrapped(*args, **kwargs):
            token = request.headers.get('Authorization', '').replace('Bearer ', '', 1).strip() or request.args.get('token', '').strip()
            if not token:
                return jsonify({'error': 'Debes iniciar sesión para continuar'}), 401
            try:
                payload = decode_token(token)
            except jwt.PyJWTError:
                return jsonify({'error': 'Token inválido o expirado'}), 401
            user = get_user(payload.get('sub'))
            if not is_active(user):
                return jsonify({'error': 'Usuario no encontrado o inactivo'}), 401
            if not has_role(user, roles):
                return jsonify({'error': 'No tienes permisos para realizar esta acción'}), 403
            request.current_user = user
            return handler(*args, **kwargs)
        return wrapped
    return decorator