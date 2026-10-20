from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.hybrid import hybrid_property


class Recibo(db.Model):
    __tablename__ = 'recibos'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    orden_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('ordenes_trabajo.id', name='fk_recibos_orden', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False, unique=True)
    fecha_emision = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    total = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    descuento = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    estado = db.Column(db.Enum('pendiente', 'pagado', 'anulado', name='recibo_estado'), nullable=False, default='pendiente')

    orden_trabajo = db.relationship('OrdenTrabajo', back_populates='recibo')
    pagos = db.relationship('Pago', back_populates='recibo', cascade='all, delete-orphan')
    detalles = db.relationship('ReciboDetalle', back_populates='recibo', cascade='all, delete-orphan')

    @hybrid_property
    def cliente_id(self):
        return self.orden_trabajo.cliente_id if self.orden_trabajo else None

    @cliente_id.expression
    def cliente_id(cls):
        from .ordentrabajo import OrdenTrabajo
        from .vehiculo import Vehiculo

        return select(Vehiculo.usuario_id).join(OrdenTrabajo, OrdenTrabajo.vehiculo_id == Vehiculo.id).where(OrdenTrabajo.id == cls.orden_id).scalar_subquery()
