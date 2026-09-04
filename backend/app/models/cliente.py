from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER
from datetime import datetime, timezone


class Cliente(db.Model):
    __tablename__ = 'clientes'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    usuario_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id'), unique=True, nullable=False)
    documento = db.Column(db.String(20), nullable=False, unique=True)
    direccion = db.Column(db.String(200), nullable=True)
    ciudad = db.Column(db.String(100), nullable=True)
    fecha_registro = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    usuario = db.relationship('Usuario', back_populates='cliente')
    vehiculos = db.relationship('Vehiculo', back_populates='cliente', cascade='all, delete-orphan')
    citas = db.relationship('Cita', back_populates='cliente', cascade='all, delete-orphan')
    ordenes_trabajo = db.relationship('OrdenTrabajo', back_populates='cliente')
