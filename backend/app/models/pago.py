from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER
from datetime import datetime, timezone


class Pago(db.Model):
    __tablename__ = 'pagos'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    recibo_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('recibos.id'), nullable=False)
    usuario_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id'), nullable=False)
    monto = db.Column(db.Numeric(10, 2), nullable=False)
    metodo_pago = db.Column(db.Enum('efectivo', 'tarjeta', 'transferencia', 'nequi', 'otro', name='pago_metodo'), nullable=False, default='nequi')
    numero_nequi = db.Column(db.String(20), nullable=True)
    referencia = db.Column(db.String(100), nullable=True, unique=True)
    estado = db.Column(db.Enum('completado', 'pendiente', 'anulado', name='pago_estado'), nullable=False, default='completado')
    fecha_pago = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    creado_en = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    recibo = db.relationship('Recibo', back_populates='pagos')
