"""Generación, validación y lectura de tokens JWT."""
from datetime import datetime, timedelta, timezone
import hmac
import jwt
from flask import current_app


def session_stamp(user):
    # Bind the signed session to the stored credential without exposing its hash.
    value = f'jenna-session-v1:{user.id}:{user.password or ""}'
    return hmac.digest(current_app.config['SECRET_KEY'].encode(), value.encode(), 'sha256').hex()


def create_access_token(usuario):
    now = datetime.now(timezone.utc)
    return jwt.encode({'sub': str(usuario.id), 'role': usuario.rol, 'session': session_stamp(usuario), 'iat': now, 'exp': now + timedelta(hours=1)}, current_app.config['SECRET_KEY'], algorithm='HS256')


def decode_token(token):
    return jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])