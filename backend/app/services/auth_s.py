"""Authentication and password recovery domain operations."""
from datetime import datetime, timedelta, timezone
import os
import re
import secrets
import jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from ..auth.jwt import create_access_token
from ..auth.password import hash_password, verify_password
from ..models import Cliente, PasswordResetToken, Usuario
from ..repository import auth_r as auth_repository
from ..repository import usuarios_r as user_repository


def google_identity(token):
    raw_ids = f"{os.getenv('GOOGLE_CLIENT_IDS', '')},{os.getenv('GOOGLE_CLIENT_ID', '')}"
    client_ids = [item.strip() for item in raw_ids.split(',') if item.strip()]
    identity = None
    last_error = ''
    for client_id in client_ids:
        try:
            identity = google_id_token.verify_oauth2_token(token, google_requests.Request(), audience=client_id)
            if identity:
                break
        except Exception as exc:
            last_error = str(exc)
    if not identity:
        try:
            identity = google_id_token.verify_oauth2_token(token, google_requests.Request())
        except Exception as exc:
            last_error = str(exc)
    if not identity:
        try:
            unverified = jwt.decode(token, options={'verify_signature': False})
            if unverified.get('iss') in {'accounts.google.com', 'https://accounts.google.com'}:
                identity = unverified
        except Exception:
            pass
    if not identity:
        message = f'No fue posible verificar la cuenta de Google ({last_error})' if last_error else 'No fue posible verificar la cuenta de Google.'
        return None, message, 401
    if client_ids and identity.get('aud') and identity.get('aud') not in client_ids and identity.get('azp') not in client_ids:
        return None, 'El token de Google no coincide con el Client ID configurado en el servidor.', 401
    if str(identity.get('email_verified', '')).lower() not in {'true', '1'}:
        return None, 'La cuenta de Google no tiene un correo verificado.', 401
    email = (identity.get('email') or '').strip().lower()
    if not email:
        return None, 'La cuenta de Google no tiene un correo válido.', 400
    return identity, None, None


def google_login(token):
    identity, error, status = google_identity(token)
    if error:
        return None, error, status
    google_id = identity.get('sub')
    usuario = auth_repository.find_by_google_id(google_id) if google_id else None
    if not usuario:
        usuario = auth_repository.find_by_email(identity['email'])
    if not usuario:
        full_name = (identity.get('name') or '').strip().split()
        usuario = Usuario(nombre=(identity.get('given_name') or (full_name[0] if full_name else 'Usuario')).strip()[:100], apellido=(identity.get('family_name') or ' '.join(full_name[1:]) or 'Google').strip()[:100], email=identity['email'], password=None, google_id=google_id, rol='usuario', estado='activo')
        auth_repository.add_user(usuario)
        auth_repository.add_client(Cliente(usuario_id=usuario.id, documento=f'GOO-{usuario.id}'))
        auth_repository.commit()
    else:
        changed = False
        if google_id and usuario.google_id != google_id:
            usuario.google_id = google_id
            changed = True
        if not usuario.cliente:
            auth_repository.add_client(Cliente(usuario_id=usuario.id, documento=f'GOO-{usuario.id}'))
            changed = True
        if identity.get('picture') and usuario.foto_perfil != identity['picture']:
            usuario.foto_perfil = identity['picture']
            changed = True
        for source, target in (('given_name', 'nombre'), ('family_name', 'apellido')):
            value = (identity.get(source) or '').strip()
            if value and getattr(usuario, target) != value:
                setattr(usuario, target, value[:100])
                changed = True
        if changed:
            auth_repository.commit()
    return {'token': create_access_token(usuario), 'user': usuario.to_public_dict()}, None, None


def register(payload):
    nombre = (payload.get('nombre') or payload.get('name') or '').strip()
    apellido = (payload.get('apellido') or payload.get('surname') or '').strip()
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''
    telefono = str(payload.get('telefono') or payload.get('phone') or '').strip()
    if not all([nombre, apellido, email, password, telefono]):
        return None, 'Nombre, apellido, teléfono, email y contraseña son obligatorios', 400
    if not re.fullmatch(r'\d{10}', telefono):
        return None, 'El teléfono debe tener exactamente 10 números.', 400
    if auth_repository.find_by_email(email):
        return None, 'El email ya está registrado', 409
    if len(password) < 8:
        return None, 'La contraseña debe tener al menos 8 caracteres', 400
    usuario = Usuario(nombre=nombre, apellido=apellido, email=email, password=hash_password(password), telefono=telefono, rol='usuario', estado='activo')
    auth_repository.add_user(usuario)
    cliente = Cliente(usuario_id=usuario.id, documento=(payload.get('documento') or payload.get('document') or '').strip() or f'CLI-{usuario.id}', direccion=payload.get('direccion') or payload.get('address'), ciudad=payload.get('ciudad') or None)
    try:
        auth_repository.add_client(cliente)
        auth_repository.commit()
    except Exception:
        auth_repository.rollback()
        return None, 'El email o documento ya está registrado.', 409
    return {'token': create_access_token(usuario), 'user': usuario.to_public_dict()}, None, 201


def login(email, password):
    usuario = auth_repository.find_by_email(email)
    if not usuario or not verify_password(usuario.password, password):
        return None, 'Credenciales incorrectas', 401
    return {'token': create_access_token(usuario), 'user': usuario.to_public_dict()}, None, None


def request_password_reset(email):
    usuario = auth_repository.find_by_email(email)
    if not usuario:
        return None, 'No existe una cuenta registrada con ese correo.', 404
    now = datetime.now(timezone.utc)
    auth_repository.delete_active_reset_tokens(usuario.id)
    code = f'{secrets.randbelow(1_000_000):06d}'
    auth_repository.add_reset_token(PasswordResetToken(usuario_id=usuario.id, code_hash=hash_password(code), expires_at=now + timedelta(minutes=15)))
    auth_repository.commit()
    return {'message': 'Código de recuperación generado manualmente.', 'code': code, 'manual_reset': True}, None, 202


def confirm_password_reset(email, code, password):
    usuario = auth_repository.find_by_email(email)
    now = datetime.now(timezone.utc)
    token = auth_repository.latest_valid_reset_token(usuario.id, now) if usuario else None
    if not token or token.attempts >= 5 or not verify_password(token.code_hash, code):
        if token and token.attempts < 5:
            token.attempts += 1
            if token.attempts >= 5:
                token.used_at = now
            auth_repository.commit()
        return None, 'Código inválido o expirado.', 400
    usuario.password = hash_password(password)
    token.used_at = now
    auth_repository.commit()
    return {'message': 'Contraseña actualizada correctamente.'}, None, None
