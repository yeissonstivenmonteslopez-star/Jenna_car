from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER
from sqlalchemy import Enum as SaEnum, TIMESTAMP, Numeric
from sqlalchemy import select
from sqlalchemy.ext.hybrid import hybrid_property
from datetime import datetime, timezone
from .vehiculo import Vehiculo


class OrdenTrabajo(db.Model):
    __tablename__ = 'ordenes_trabajo'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    vehiculo_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('vehiculos.id', name='fk_orden_vehiculo', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False)
    fecha_ingreso = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    fecha_entrega = db.Column(db.DateTime, nullable=True)
    kilometraje = db.Column(INTEGER(unsigned=True), nullable=False, default=0)
    problema_reportado = db.Column(db.Text, nullable=False)
    observaciones = db.Column(db.Text, nullable=True)
    estado = db.Column(SaEnum('pendiente', 'en_diagnostico', 'en_reparacion', 'terminada', 'entregada', 'cancelada', name='orden_estado'), nullable=False, default='pendiente')
    subtotal = db.Column(Numeric(10, 2), nullable=False, default=0.00)
    total = db.Column(Numeric(10, 2), nullable=False, default=0.00)
    created_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    cliente = property(lambda self: self.vehiculo.cliente if self.vehiculo else None)

    @hybrid_property
    def cliente_id(self):
        return self.vehiculo.usuario_id if self.vehiculo else None

    @cliente_id.expression
    def cliente_id(cls):
        return select(Vehiculo.usuario_id).where(Vehiculo.id == cls.vehiculo_id).scalar_subquery()
    vehiculo = db.relationship('Vehiculo', back_populates='ordenes_trabajo')
    trabajos = db.relationship('Trabajo', back_populates='orden', cascade='all, delete-orphan')
    recibo = db.relationship('Recibo', back_populates='orden_trabajo', uselist=False)

    @property
    def diagnostico(self):
        descriptions = [item.diagnostico.descripcion for item in self.trabajos if item.diagnostico]
        return '\n'.join(dict.fromkeys(descriptions)) or None

    @property
    def trabajo_realizado(self):
        descriptions = [item.descripcion for item in self.trabajos if item.estado == 'completado']
        return '\n'.join(descriptions) or None
