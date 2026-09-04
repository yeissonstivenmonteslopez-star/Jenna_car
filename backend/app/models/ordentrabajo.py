from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER
from sqlalchemy import Enum as SaEnum, TIMESTAMP, Numeric
from datetime import datetime, timezone


class OrdenTrabajo(db.Model):
    __tablename__ = 'ordenes_trabajo'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    cliente_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('clientes.id'), nullable=False)
    vehiculo_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('vehiculos.id'), nullable=False)
    fecha_ingreso = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    fecha_entrega = db.Column(db.DateTime, nullable=True)
    kilometraje = db.Column(INTEGER(unsigned=True), nullable=True, default=0)
    problema_reportado = db.Column(db.Text, nullable=False)
    diagnostico = db.Column(db.Text, nullable=True)
    trabajo_realizado = db.Column(db.Text, nullable=True)
    observaciones = db.Column(db.Text, nullable=True)
    estado = db.Column(SaEnum('pendiente', 'en_diagnostico', 'en_reparacion', 'terminada', 'entregada', 'cancelada', name='orden_estado'), nullable=False, default='pendiente')
    subtotal = db.Column(Numeric(10, 2), nullable=False, default=0.00)
    total = db.Column(Numeric(10, 2), nullable=False, default=0.00)
    created_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    cliente = db.relationship('Cliente', back_populates='ordenes_trabajo')
    vehiculo = db.relationship('Vehiculo', back_populates='ordenes_trabajo')
    ordenes_servicios = db.relationship('OrdenServicio', back_populates='orden', cascade='all, delete-orphan')
    recibo = db.relationship('Recibo', back_populates='orden_trabajo', uselist=False)
