from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER, TIMESTAMP
from datetime import datetime, timezone


class Trabajo(db.Model):
    __tablename__ = 'trabajos'

    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    diagnostico_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('diagnosticos.id', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False, index=True)
    servicio_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('servicios.id', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False, index=True)
    mecanico_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False, index=True)
    orden_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('ordenes_trabajo.id', ondelete='SET NULL', onupdate='CASCADE'), nullable=True, index=True)
    descripcion = db.Column(db.Text, nullable=False)
    estado = db.Column(db.Enum('pendiente', 'en_proceso', 'completado', 'cancelado', name='trabajo_estado'), nullable=False, default='pendiente', index=True)
    fecha_inicio = db.Column(db.DateTime, nullable=True)
    fecha_fin = db.Column(db.DateTime, nullable=True)
    cantidad = db.Column(INTEGER(unsigned=True), nullable=False, default=1)
    precio = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    created_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    diagnostico = db.relationship('Diagnostico', back_populates='trabajos')
    servicio = db.relationship('Servicio', back_populates='trabajos')
    mecanico = db.relationship('Usuario', foreign_keys=[mecanico_id])
    orden = db.relationship('OrdenTrabajo', back_populates='trabajos')
    imagenes = db.relationship('ImagenTrabajo', back_populates='trabajo', cascade='all, delete-orphan')