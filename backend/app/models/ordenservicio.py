from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER


class OrdenServicio(db.Model):
    __tablename__ = 'orden_servicios'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    orden_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('ordenes_trabajo.id'), nullable=False)
    servicio_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('servicios.id'), nullable=False)
    cantidad = db.Column(INTEGER(unsigned=True), nullable=False, default=1)
    precio = db.Column(db.Numeric(10, 2), nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)

    orden = db.relationship('OrdenTrabajo', back_populates='ordenes_servicios')
    servicio = db.relationship('Servicio', back_populates='ordenes_servicios')