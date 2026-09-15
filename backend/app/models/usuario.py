from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER
from datetime import datetime, timezone


class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(100), nullable=False)
    apellido = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), nullable=False, unique=True, index=True)
    password = db.Column(db.String(255), nullable=True)
    google_id = db.Column(db.String(255), nullable=True, unique=True)
    telefono = db.Column(db.String(20), nullable=True)
    rol = db.Column(db.String(20), nullable=False, default='usuario')
    estado = db.Column(db.String(20), nullable=False, default='activo')
    foto_perfil = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    cliente = db.relationship('Cliente', back_populates='usuario', uselist=False, cascade='all, delete-orphan')
    notificaciones = db.relationship('Notificacion', back_populates='usuario', cascade='all, delete-orphan')

    def verify_password(self, raw_password):
        from ..auth.password import verify_password
        return verify_password(self.password, raw_password)

    def to_public_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'apellido': self.apellido,
            'email': self.email,
            'telefono': self.telefono,
            'rol': self.rol,
            'estado': self.estado,
            'foto_perfil': self.foto_perfil,
            'google_id': self.google_id,
        }
