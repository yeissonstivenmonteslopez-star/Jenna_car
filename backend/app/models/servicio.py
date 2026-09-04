from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER, TIMESTAMP
from datetime import datetime, timezone


class Servicio(db.Model):
    __tablename__ = 'servicios'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    precio = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    duracion_estimada = db.Column(INTEGER(unsigned=True), nullable=True)
    estado = db.Column(db.String(20), nullable=False, default='activo')
    created_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    ordenes_servicios = db.relationship('OrdenServicio', back_populates='servicio')
