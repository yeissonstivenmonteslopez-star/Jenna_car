from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER
from sqlalchemy import Enum as SaEnum
from datetime import datetime, timezone


class Cita(db.Model):
    __tablename__ = 'citas'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    cliente_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('clientes.id'), nullable=False)
    vehiculo_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('vehiculos.id'), nullable=False)
    servicio_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('servicios.id'), nullable=False)
    fecha = db.Column(db.Date, nullable=False)
    hora = db.Column(db.Time, nullable=False)
    motivo = db.Column(db.Text, nullable=True)
    observaciones = db.Column(db.Text, nullable=True)
    estado = db.Column(SaEnum('pendiente', 'confirmada', 'atendida', 'cancelada', name='cita_estado'), nullable=False, default='pendiente')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    cliente = db.relationship('Cliente', back_populates='citas')
    vehiculo = db.relationship('Vehiculo')
    servicio = db.relationship('Servicio')
