from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER


class ReciboDetalle(db.Model):
    __tablename__ = 'recibo_detalles'

    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    recibo_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('recibos.id', ondelete='CASCADE', onupdate='CASCADE'), nullable=False, index=True)
    descripcion = db.Column(db.String(255), nullable=False)
    cantidad = db.Column(INTEGER(unsigned=True), nullable=False, default=1)
    precio_unitario = db.Column(db.Numeric(10, 2), nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)

    recibo = db.relationship('Recibo', back_populates='detalles')