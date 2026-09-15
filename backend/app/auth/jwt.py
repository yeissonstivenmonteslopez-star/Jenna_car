"""Generación, validación y lectura de tokens JWT."""
from datetime import datetime, timedelta, timezone
import jwt
from flask import current_app


def create_access_token(usuario):
    now = datetime.now(timezone.utc)
    return jwt.encode({'sub': str(usuario.id), 'role': usuario.rol, 'iat': now, 'exp': now + timedelta(hours=1)}, current_app.config['SECRET_KEY'], algorithm='HS256')


def decode_token(token):
    return jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])