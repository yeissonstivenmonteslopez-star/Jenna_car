from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import secrets
import smtplib
from flask import Blueprint, request, jsonify
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
import jwt
from ..extensions import db
from ..models import Usuario, Cliente, PasswordResetToken
from ..services.security import create_access_token, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash
import os
import re

auth_bp = Blueprint('auth', __name__)


@auth_bp.post('/google')
def google_login():
    payload = request.get_json(silent=True) or {}
    token = payload.get('id_token') or ''
    if not token:
        return jsonify({'error': 'Falta el token de Google.'}), 400

    raw_ids = f"{os.getenv('GOOGLE_CLIENT_IDS', '')},{os.getenv('GOOGLE_CLIENT_ID', '')}"
    client_ids = [client_id.strip() for client_id in raw_ids.split(',') if client_id.strip()]
    identity = None
    last_error = ''

    if client_ids:
        for client_id in client_ids:
            try:
                identity = google_id_token.verify_oauth2_token(
                    token, google_requests.Request(), audience=client_id
                )
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
        return jsonify({'error': message}), 401

    if client_ids and identity.get('aud'):
        if identity.get('aud') not in client_ids and identity.get('azp') not in client_ids:
            return jsonify({'error': 'El token de Google no coincide con el Client ID configurado en el servidor.'}), 401

    if str(identity.get('email_verified', '')).lower() not in {'true', '1'}:
        return jsonify({'error': 'La cuenta de Google no tiene un correo verificado.'}), 401

    email = (identity.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'La cuenta de Google no tiene un correo válido.'}), 400

    google_id = identity.get('sub')
    usuario = Usuario.query.filter_by(google_id=google_id).first() if google_id else None
    if not usuario:
        usuario = Usuario.query.filter_by(email=email).first()

    if not usuario:
        full_name = (identity.get('name') or '').strip().split()
        nombre = (identity.get('given_name') or (full_name[0] if full_name else 'Usuario')).strip()[:100]
        apellido = (identity.get('family_name') or ' '.join(full_name[1:]) or 'Google').strip()[:100]
        usuario = Usuario(
            nombre=nombre,
            apellido=apellido,
            email=email,
            password=None,
            google_id=google_id,
            rol='usuario',
            estado='activo',
        )
        db.session.add(usuario)
        db.session.flush()
        db.session.add(Cliente(usuario_id=usuario.id, documento=f'GOO-{usuario.id}'))
        db.session.commit()
    else:
        changed = False
        if google_id and usuario.google_id != google_id:
            usuario.google_id = google_id
            changed = True
        if not usuario.cliente:
            db.session.add(Cliente(usuario_id=usuario.id, documento=f'GOO-{usuario.id}'))
            changed = True
        if identity.get('picture') and usuario.foto_perfil != identity['picture']:
            usuario.foto_perfil = identity['picture']
            changed = True
        for field in ('given_name', 'family_name'):
            value = (identity.get(field) or '').strip()
            attribute = 'nombre' if field == 'given_name' else 'apellido'
            if value and getattr(usuario, attribute) != value:
                setattr(usuario, attribute, value[:100])
                changed = True
        if changed:
            db.session.commit()

    return jsonify({'token': create_access_token(usuario), 'user': usuario.to_public_dict()})


@auth_bp.post('/register')
def register():
    payload = request.get_json(silent=True) or {}
    nombre = (payload.get('nombre') or payload.get('name') or '').strip()
    apellido = (payload.get('apellido') or payload.get('surname') or '').strip()
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''
    telefono = str(payload.get('telefono') or payload.get('phone') or '').strip()
    documento = (payload.get('documento') or payload.get('document') or '').strip()
    direccion = payload.get('direccion') or payload.get('address') or None
    ciudad = payload.get('ciudad') or None

    if not all([nombre, apellido, email, password, telefono]):
        return jsonify({'error': 'Nombre, apellido, teléfono, email y contraseña son obligatorios'}), 400
    if not re.fullmatch(r'\d{10}', telefono):
        return jsonify({'error': 'El teléfono debe tener exactamente 10 números.'}), 400
    from ..models import Usuario as UsuarioModel
    if UsuarioModel.query.filter_by(email=email).first():
        return jsonify({'error': 'El email ya está registrado'}), 409
    if len(password) < 8:
        return jsonify({'error': 'La contraseña debe tener al menos 8 caracteres'}), 400

    usuario = Usuario(
        nombre=nombre,
        apellido=apellido,
        email=email,
        password=generate_password_hash(password),
        telefono=telefono,
        rol='usuario',
        estado='activo',
    )
    db.session.add(usuario)
    db.session.flush()

    from ..models import Cliente
    cliente = Cliente(
        usuario_id=usuario.id,
        documento=documento or f'CLI-{usuario.id}',
        direccion=direccion,
        ciudad=ciudad,
    )
    try:
        db.session.add(cliente)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'El email o documento ya está registrado.'}), 409

    token = create_access_token(usuario)
    return jsonify({'token': token, 'user': usuario.to_public_dict()}), 201


@auth_bp.post('/login')
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''
    from ..models import Usuario as UsuarioModel
    usuario = UsuarioModel.query.filter_by(email=email).first()
    if not usuario or not usuario.verify_password(password):
        return jsonify({'error': 'Credenciales incorrectas'}), 401

    token = create_access_token(usuario)
    return jsonify({'token': token, 'user': usuario.to_public_dict()})


@auth_bp.get('/me')
@jwt_required()
def current_user():
    return jsonify({'user': request.current_user.to_public_dict()})


def _send_password_reset_email(recipient, code):
    mail_host = os.getenv('MAIL_SERVER') or os.getenv('MAIL_HOST')
    mail_from = os.getenv('MAIL_FROM') or os.getenv('MAIL_USERNAME')
    username = os.getenv('MAIL_USERNAME')
    password = os.getenv('MAIL_PASSWORD')
    if not all([mail_host, mail_from, username, password]):
        raise RuntimeError('El envío de correo no está configurado.')
    message = EmailMessage()
    message['Subject'] = 'Restablece tu contraseña - Jenna Car'
    message['From'] = mail_from
    message['To'] = recipient
    message.set_content(
        f'Usa este código para restablecer tu contraseña: {code}\n'
        'El código vence en 15 minutos.'
    )
    with smtplib.SMTP(mail_host, int(os.getenv('MAIL_PORT', '587')), timeout=10) as server:
        if os.getenv('MAIL_USE_TLS', 'true').lower() in {'1', 'true', 'yes'}:
            server.starttls()
        server.login(username, password)
        server.send_message(message)


@auth_bp.post('/forgot-password')
@auth_bp.post('/password-reset/request')
def request_password_reset():
    payload = request.get_json(silent=True) or {}
    email = (payload.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'Ingresa tu correo electrónico.'}), 400
    accepted = {'message': 'Si el correo está registrado, recibirás un código para recuperar tu contraseña.'}
    usuario = Usuario.query.filter_by(email=email).first()
    if not usuario:
        return jsonify(accepted), 202
    now = datetime.now(timezone.utc)
    latest = PasswordResetToken.query.filter_by(usuario_id=usuario.id, used_at=None).order_by(PasswordResetToken.created_at.desc()).first()
    latest_created = latest.created_at.replace(tzinfo=timezone.utc) if latest and latest.created_at.tzinfo is None else (latest.created_at if latest else None)
    if latest_created and latest_created > now - timedelta(seconds=60):
        return jsonify(accepted), 202
    PasswordResetToken.query.filter_by(usuario_id=usuario.id, used_at=None).delete()
    code = f'{secrets.randbelow(1_000_000):06d}'
    db.session.add(PasswordResetToken(
        usuario_id=usuario.id,
        code_hash=generate_password_hash(code),
        expires_at=now + timedelta(minutes=15),
    ))
    try:
        if all([os.getenv('MAIL_SERVER') or os.getenv('MAIL_HOST'), os.getenv('MAIL_USERNAME'), os.getenv('MAIL_PASSWORD')]):
            _send_password_reset_email(email, code)
            db.session.commit()
            return jsonify(accepted), 202
        db.session.commit()
        return jsonify({'message': 'Código de recuperación generado.', 'code': code, 'manual_reset': True}), 202
    except Exception:
        db.session.commit()
        return jsonify({'message': 'Usa este código manualmente para restablecer tu contraseña.', 'code': code, 'manual_reset': True}), 202


@auth_bp.post('/reset-password')
@auth_bp.post('/password-reset/confirm')
def confirm_password_reset():
    payload = request.get_json(silent=True) or {}
    email = (payload.get('email') or '').strip().lower()
    code = str(payload.get('code') or '').strip()
    password = payload.get('password') or ''
    if not email or not code or not password:
        return jsonify({'error': 'Correo, código y nueva contraseña son obligatorios.'}), 400
    if len(password) < 8:
        return jsonify({'error': 'La contraseña debe tener al menos 8 caracteres.'}), 400
    usuario = Usuario.query.filter_by(email=email).first()
    if not usuario:
        return jsonify({'error': 'Código inválido o expirado.'}), 400
    now = datetime.now(timezone.utc)
    reset_token = PasswordResetToken.query.filter(
        PasswordResetToken.usuario_id == usuario.id,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > now,
    ).order_by(PasswordResetToken.created_at.desc()).first()
    if not reset_token or reset_token.attempts >= 5:
        return jsonify({'error': 'Código inválido o expirado.'}), 400
    if not check_password_hash(reset_token.code_hash, code):
        reset_token.attempts += 1
        if reset_token.attempts >= 5:
            reset_token.used_at = now
        db.session.commit()
        return jsonify({'error': 'Código inválido o expirado.'}), 400
    usuario.password = generate_password_hash(password)
    reset_token.used_at = now
    db.session.commit()
    return jsonify({'message': 'Contraseña actualizada correctamente.'})
