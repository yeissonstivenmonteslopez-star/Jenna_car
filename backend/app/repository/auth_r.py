from ..extensions import db
from ..models import Cliente, PasswordResetToken
from .usuarios_r import find_by_email, find_by_google_id, add_and_flush


def add_client(client):
    db.session.add(client)
    return client


def add_user(user):
    return add_and_flush(user)


def add_reset_token(token):
    db.session.add(token)


def delete_active_reset_tokens(user_id):
    PasswordResetToken.query.filter_by(usuario_id=user_id, used_at=None).delete()


def latest_valid_reset_token(user_id, now):
    return PasswordResetToken.query.filter(
        PasswordResetToken.usuario_id == user_id,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > now,
    ).order_by(PasswordResetToken.created_at.desc()).first()


def commit():
    db.session.commit()


def rollback():
    db.session.rollback()