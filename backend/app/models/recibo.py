from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER
from datetime import datetime, timezone


class Recibo(db.Model):
    __tablename__ = 'recibos'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    orden_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('ordenes_trabajo.id'), nullable=False, unique=True)
    cliente_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('clientes.id'), nullable=False)
    fecha_emision = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    total = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    descuento = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    estado = db.Column(db.Enum('pendiente', 'pagado', 'anulado', name='recibo_estado'), nullable=False, default='pendiente')

    orden_trabajo = db.relationship('OrdenTrabajo', back_populates='recibo')
    pagos = db.relationship('Pago', back_populates='recibo', cascade='all, delete-orphan')
