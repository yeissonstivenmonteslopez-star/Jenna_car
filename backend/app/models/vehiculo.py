from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER, YEAR
from sqlalchemy.orm import synonym
from datetime import datetime, timezone


class Vehiculo(db.Model):
    __tablename__ = 'vehiculos'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    usuario_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False)
    cliente_id = synonym('usuario_id')
    placa = db.Column(db.String(20), nullable=False, unique=True)
    marca = db.Column(db.String(100), nullable=False)
    modelo = db.Column(db.String(100), nullable=False)
    anio = db.Column(db.Integer().with_variant(YEAR, 'mysql'), nullable=True)
    color = db.Column(db.String(50), nullable=True)
    kilometraje = db.Column(INTEGER(unsigned=True), nullable=False, default=0)
    tipo_combustible = db.Column(db.Enum('gasolina', 'diesel', 'hibrido', 'electrico', 'gas', name='vehiculo_combustible'), nullable=False, default='gasolina')
    estado = db.Column(db.Enum('activo', 'en_mantenimiento', 'inactivo', name='vehiculo_estado'), nullable=False, default='activo')
    created_at = db.Column(db.TIMESTAMP, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    cliente = db.relationship('Usuario', back_populates='vehiculos')
    ordenes_trabajo = db.relationship('OrdenTrabajo', back_populates='vehiculo')
