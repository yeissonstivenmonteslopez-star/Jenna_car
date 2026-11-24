"""Authentication and password recovery domain operations."""
from datetime import datetime, timedelta, timezone
import os
import re
import secrets
from threading import local
import requests
from cachecontrol import CacheControl
from cachecontrol.cache import DictCache
from sqlalchemy.exc import IntegrityError
import jwt
from flask import current_app
from google.auth import exceptions as google_auth_error
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from ..auth.jwt import create_access_token
from ..auth.password import hash_password, verify_password
from ..models import PasswordResetToken, Usuario
from ..repository import auth_r as auth_repository
from ..repository import usuarios_r as user_repository
from .reset_limits import allow_reset_request
from concurrent.futures import ThreadPoolExecutor
from threading import BoundedSemaphore


_certificate_cache = DictCache()
_google_transport = local()


def _verification_request():
    if not hasattr(_google_transport, 'request'):
        session = CacheControl(requests.Session(), cache=_certificate_cache)
        _google_transport.request = google_requests.Request(session=session)
    return _google_transport.request


def google_identity(token):
    raw_ids = f"{os.getenv('GOOGLE_CLIENT_IDS', '')},{os.getenv('GOOGLE_CLIENT_ID', '')}"
    client_ids = [item.strip() for item in raw_ids.split(',') if item.strip()]
    if not client_ids:
        return None, 'El acceso con Google no está configurado.', 503
    if not isinstance(token, str) or not token.strip():
        return None, 'Token de Google inválido.', 401
    try:
        identity = google_id_token.verify_oauth2_token(
            token, _verification_request(),
            audience=client_ids[0] if len(client_ids) == 1 else client_ids,
            clock_skew_in_seconds=60,
        )
    except (ValueError, google_auth_error.GoogleAuthError):
        return None, 'No fue posible verificar la cuenta de Google.', 401
    if not identity or identity.get('aud') not in client_ids or not identity.get('sub'):
        return None, 'No fue posible verificar la cuenta de Google.', 401
    if identity.get('iss') not in {'accounts.google.com', 'https://accounts.google.com'}:
        return None, 'Emisor de Google inválido.', 401
    if str(identity.get('email_verified', '')).lower() not in {'true', '1'}:
        return None, 'La cuenta de Google no tiene un correo verificado.', 401
    email = (identity.get('email') or '').strip().lower()
    if not email:
        return None, 'La cuenta de Google no tiene un correo válido.', 400
    identity['email'] = email
    return identity, None, None


def google_login(token):
    identity, error, status = google_identity(token)
    if error:
        return None, error, status
    google_id = identity.get('sub')
    usuario = auth_repository.find_by_google_id(google_id) if google_id else None
    if not usuario:
        usuario = auth_repository.find_by_email(identity['email'])
        if usuario:
            usuario = auth_repository.lock_user(usuario.id)
    if not usuario:
        full_name = (identity.get('name') or '').strip().split()
        usuario = Usuario(nombre=(identity.get('given_name') or (full_name[0] if full_name else 'Usuario')).strip()[:100], apellido=(identity.get('family_name') or ' '.join(full_name[1:]) or 'Google').strip()[:100], email=identity['email'], password=None, google_id=google_id, rol='usuario', estado='activo')
        usuario.foto_perfil = identity.get('picture')
        try:
            auth_repository.add_user(usuario)
            auth_repository.commit()
        except IntegrityError:
            auth_repository.rollback()
            usuario = auth_repository.find_by_google_id(google_id) or auth_repository.find_by_email(identity['email'])
            if not usuario:
                raise
            usuario = auth_repository.lock_user(usuario.id)
    if usuario.estado != 'activo':
        return None, 'Usuario inactivo.', 403
    if usuario.google_id and usuario.google_id != google_id:
        return None, 'La cuenta de Google no coincide con la cuenta vinculada.', 403
    changed = False
    if google_id and usuario.google_id != google_id:
        usuario.google_id = google_id
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
    if len(password) < 8:
        return None, 'La contraseña debe tener al menos 8 caracteres', 400
    usuario = Usuario(
        nombre=nombre,
        apellido=apellido,
        email=email,
        password=hash_password(password),
        telefono=telefono,
        documento=(payload.get('documento') or payload.get('document') or '').strip() or None,
        direccion=payload.get('direccion') or payload.get('address') or None,
        ciudad=payload.get('ciudad') or None,
        rol='usuario',
        estado='activo',
    )
    try:
        auth_repository.add_user(usuario)
        auth_repository.commit()
    except IntegrityError:
        auth_repository.rollback()
        return None, 'El email o documento ya está registrado.', 409
    return {'token': create_access_token(usuario), 'user': usuario.to_public_dict()}, None, 201


def login(email, password):
    usuario = auth_repository.find_by_email(email)
    if not usuario or not verify_password(usuario.password, password):
        return None, 'Credenciales incorrectas', 401
    return {'token': create_access_token(usuario), 'user': usuario.to_public_dict()}, None, None


_reset_executor = ThreadPoolExecutor(max_workers=2)
_reset_capacity = BoundedSemaphore(12)


def request_password_reset(email, origin):
    from ..utils.email import correo_configurado
    if not correo_configurado():
        return None, 'La recuperación de contraseña no está disponible temporalmente.', 503
    accepted = {'message': 'Si existe una cuenta con ese correo, recibirás las instrucciones.'}, None, 202
    if not allow_reset_request(email, origin):
        return accepted
    if not _reset_capacity.acquire(blocking=False):
        return None, 'Inténtalo de nuevo más tarde.', 503
    app = current_app._get_current_object()
    try:
        _reset_executor.submit(_process_reset, app, email)
    except RuntimeError:
        _reset_capacity.release()
        return None, 'Inténtalo de nuevo más tarde.', 503
    return accepted


def _process_reset(app, email):
    try:
        with app.app_context():
            _issue_reset(email)
    except Exception:
        app.logger.exception('Error al procesar una solicitud de recuperación')
    finally:
        _reset_capacity.release()


def _issue_reset(email):
    from ..utils.email import enviar_correo_async
    usuario = auth_repository.find_by_email(email)
    if not usuario:
        return
    auth_repository.lock_user(usuario.id)
    now = datetime.now(timezone.utc)
    if auth_repository.recent_reset_token(usuario.id, now - timedelta(minutes=1)):
        return
    auth_repository.delete_active_reset_tokens(usuario.id)
    code = f'{secrets.randbelow(1_000_000):06d}'
    auth_repository.add_reset_token(PasswordResetToken(usuario_id=usuario.id, code_hash=hash_password(code), expires_at=now + timedelta(minutes=15)))
    auth_repository.commit()

    mensaje_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f3f0eb; padding: 20px; text-align: center; border-bottom: 1px solid #ddd;">
            <h2 style="color: #333; margin: 0;">Jenna Car - Recuperación de contraseña</h2>
        </div>
        <div style="padding: 20px; color: #555;">
            <p style="font-size: 16px;">Hola,</p>
            <p style="font-size: 16px;">Has solicitado restablecer tu contraseña. Tu código de recuperación es:</p>
            <h1 style="color: #b52d2d; text-align: center; font-size: 36px; margin: 20px 0;">{code}</h1>
            <p style="font-size: 16px;">Este código expirará en 15 minutos.</p>
        </div>
        <div style="background-color: #f3f0eb; padding: 10px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #ddd;">
            <p>Si no solicitaste esto, puedes ignorar este correo.</p>
        </div>
    </div>
    """
    if not enviar_correo_async(email, "Código de recuperación de contraseña", mensaje_html):
        current_app.logger.warning('El correo de recuperación no pudo entregarse.')


def _validate_reset_code(email, code):
    usuario = auth_repository.find_by_email(email)
    now = datetime.now(timezone.utc)
    if usuario:
        usuario = auth_repository.lock_user(usuario.id)
    token = auth_repository.latest_valid_reset_token(usuario.id, now) if usuario else None
    if not token or token.attempts >= 5 or not verify_password(token.code_hash, code):
        if token and token.attempts < 5:
            token.attempts += 1
            if token.attempts >= 5:
                token.used_at = now
            auth_repository.commit()
        return None, None, 'Código inválido o expirado.'
    return usuario, token, None


def verify_password_reset_code(email, code):
    _, _, error = _validate_reset_code(email, code)
    if error:
        return None, error, 400
    return {'message': 'Código validado correctamente.'}, None, None


def confirm_password_reset(email, code, password):
    usuario, token, error = _validate_reset_code(email, code)
    if error:
        return None, error, 400
    usuario.password = hash_password(password)
    token.used_at = datetime.now(timezone.utc)
    auth_repository.commit()
    return {'message': 'Contraseña actualizada correctamente.'}, None, None
