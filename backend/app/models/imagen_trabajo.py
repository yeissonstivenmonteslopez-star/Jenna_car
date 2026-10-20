from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER, TIMESTAMP
from datetime import datetime, timezone


class ImagenTrabajo(db.Model):
    __tablename__ = 'imagenes_trabajo'

    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    trabajo_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('trabajos.id', ondelete='CASCADE', onupdate='CASCADE'), nullable=False, index=True)
    usuario_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False, index=True)
    ruta_imagen = db.Column(db.String(500), nullable=False)
    descripcion = db.Column(db.String(255), nullable=True)
    created_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))

    trabajo = db.relationship('Trabajo', back_populates='imagenes')
    usuario = db.relationship('Usuario')