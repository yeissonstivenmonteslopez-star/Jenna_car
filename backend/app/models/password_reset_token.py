from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER, SMALLINT, TIMESTAMP
from datetime import datetime, timezone


class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'

    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    usuario_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id', name='fk_reset_usuario', ondelete='CASCADE', onupdate='CASCADE'), nullable=False, index=True)
    code_hash = db.Column(db.String(255), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    attempts = db.Column(SMALLINT(unsigned=True), nullable=False, default=0)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(TIMESTAMP, nullable=False, default=lambda: datetime.now(timezone.utc))
