from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER, TIMESTAMP
from sqlalchemy import Enum as SaEnum, UniqueConstraint, Index, select
from sqlalchemy.ext.hybrid import hybrid_property
from datetime import datetime, timezone
from .vehiculo import Vehiculo


class Cita(db.Model):
    __tablename__ = 'citas'
    __table_args__ = (
        UniqueConstraint('vehiculo_id', 'fecha', 'hora', name='uq_citas_vehiculo_fecha_hora'),
        UniqueConstraint('mecanico_id', 'fecha', 'hora', name='uq_citas_mecanico_fecha_hora'),
        Index('idx_citas_fecha_hora', 'fecha', 'hora'),
    )
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    vehiculo_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('vehiculos.id', name='fk_citas_vehiculo', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False)
    mecanico_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id', ondelete='SET NULL', onupdate='CASCADE'), nullable=True)
    servicio_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('servicios.id', name='fk_citas_servicio', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False)
    fecha = db.Column(db.Date, nullable=False)
    hora = db.Column(db.Time, nullable=False)
    motivo = db.Column(db.Text, nullable=True)
    observaciones = db.Column(db.Text, nullable=True)
    estado = db.Column(SaEnum('pendiente', 'confirmada', 'atendida', 'cancelada', name='cita_estado'), nullable=False, default='pendiente')
    created_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    vehiculo = db.relationship('Vehiculo')
    mecanico = db.relationship('Usuario', foreign_keys=[mecanico_id])
    servicio = db.relationship('Servicio')

    @property
    def cliente(self):
        return self.vehiculo.cliente if self.vehiculo else None

    @hybrid_property
    def cliente_id(self):
        return self.vehiculo.usuario_id if self.vehiculo else None

    @cliente_id.expression
    def cliente_id(cls):
        return select(Vehiculo.usuario_id).where(Vehiculo.id == cls.vehiculo_id).scalar_subquery()
