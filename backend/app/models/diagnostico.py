from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER, TIMESTAMP
from datetime import datetime, timezone


class Diagnostico(db.Model):
    __tablename__ = 'diagnosticos'

    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    cita_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('citas.id', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False, index=True)
    mecanico_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False, index=True)
    descripcion = db.Column(db.Text, nullable=False)
    observaciones = db.Column(db.Text, nullable=True)
    solucion_recomendada = db.Column(db.Text, nullable=True)
    estado = db.Column(db.Enum('pendiente', 'en_proceso', 'completado', name='diagnostico_estado'), nullable=False, default='pendiente')
    fecha_diagnostico = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    created_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    cita = db.relationship('Cita', backref='diagnosticos')
    mecanico = db.relationship('Usuario', foreign_keys=[mecanico_id])
    trabajos = db.relationship('Trabajo', back_populates='diagnostico', cascade='all, delete-orphan')