from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER, YEAR
from datetime import datetime, timezone


class Vehiculo(db.Model):
    __tablename__ = 'vehiculos'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    cliente_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('clientes.id'), nullable=False)
    placa = db.Column(db.String(10), nullable=False, unique=True)
    marca = db.Column(db.String(50), nullable=False)
    modelo = db.Column(db.String(50), nullable=False)
    anio = db.Column(db.Integer().with_variant(YEAR, 'mysql'), nullable=True)
    color = db.Column(db.String(30), nullable=True)
    kilometraje = db.Column(INTEGER(unsigned=True), nullable=False, default=0)
    tipo_combustible = db.Column(db.String(20), nullable=False, default='gasolina')
    estado = db.Column(db.String(20), nullable=False, default='activo')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    cliente = db.relationship('Cliente', back_populates='vehiculos')
    ordenes_trabajo = db.relationship('OrdenTrabajo', back_populates='vehiculo')
