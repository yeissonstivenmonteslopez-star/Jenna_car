from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER, TIMESTAMP
from sqlalchemy.orm import synonym
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
    documento = db.Column(db.String(30), nullable=True, unique=True)
    direccion = db.Column(db.String(255), nullable=True)
    ciudad = db.Column(db.String(100), nullable=True)
    fecha_registro = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
    rol = db.Column(db.Enum('admin', 'usuario', 'mecanico', name='usuario_rol'), nullable=False, default='usuario')
    estado = db.Column(db.Enum('activo', 'inactivo', name='usuario_estado'), nullable=False, default='activo')
    foto_perfil = db.Column(db.String(500), nullable=True)
    created_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    usuario_id = synonym('id')
    vehiculos = db.relationship('Vehiculo', back_populates='cliente')
    notificaciones = db.relationship('Notificacion', back_populates='usuario', cascade='all, delete-orphan')

    @property
    def usuario(self):
        return self

    @property
    def cliente(self):
        return self

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
            'documento': self.documento,
            'rol': self.rol,
            'estado': self.estado,
            'foto_perfil': self.foto_perfil,
            'google_id': self.google_id,
        }
