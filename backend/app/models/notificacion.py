from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER, TIMESTAMP
from datetime import datetime, timezone


class Notificacion(db.Model):
    __tablename__ = 'notificaciones'

    TIPOS = [
        'estado_vehiculo',
        'diagnostico',
        'reparacion_necesaria',
        'reparacion_en_proceso',
        'reparacion_finalizada',
        'vehiculo_listo',
        'observacion',
        'info_general',
        'cita',
        'pago',
        'sistema',
    ]

    TIPO_LABELS = {
        'estado_vehiculo': 'Estado del vehículo',
        'diagnostico': 'Diagnóstico',
        'reparacion_necesaria': 'Reparación necesaria',
        'reparacion_en_proceso': 'Reparación en proceso',
        'reparacion_finalizada': 'Reparación finalizada',
        'vehiculo_listo': 'Vehículo listo',
        'observacion': 'Observación',
        'info_general': 'Información general',
        'cita': 'Cita',
        'pago': 'Pago',
        'sistema': 'Sistema',
    }

    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    usuario_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id'), nullable=False, index=True)
    titulo = db.Column(db.String(150), nullable=False)
    mensaje = db.Column(db.Text, nullable=False)
    tipo = db.Column(db.String(50), nullable=False, default='sistema')
    leida = db.Column(db.Boolean, default=False, nullable=False)
    link = db.Column(db.String(255), nullable=True)
    created_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), nullable=False)

    usuario = db.relationship('Usuario', back_populates='notificaciones')

    def to_dict(self):
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'titulo': self.titulo,
            'mensaje': self.mensaje,
            'tipo': self.tipo,
            'tipo_label': self.TIPO_LABELS.get(self.tipo, self.tipo),
            'leida': self.leida,
            'link': self.link,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    @staticmethod
    def crear(usuario_id, titulo, mensaje, tipo='sistema', link=None, do_commit=True):
        notificacion = Notificacion(
            usuario_id=usuario_id,
            titulo=titulo,
            mensaje=mensaje,
            tipo=tipo,
            leida=False,
            link=link,
        )
        db.session.add(notificacion)
        if do_commit:
            db.session.commit()
        return notificacion
