"""Availability using existing rows only; no schema changes or process-local mutexes."""
from datetime import datetime, timedelta, timezone
from functools import wraps
from sqlalchemy.exc import SQLAlchemyError
from ..extensions import db
from ..models import Cita, Servicio, Usuario
from .schema_compat import column_exists

BOGOTA = timezone(timedelta(hours=-5))


def now_local():
    return datetime.now(BOGOTA).replace(tzinfo=None)


def serialize_booking(function):
    @wraps(function)
    def locked(*args, **kwargs):
        try:
            # A stable existing row serializes every appointment mutation, even on
            # an empty calendar. Held by InnoDB until commit/rollback, across workers.
            anchor = Usuario.query.order_by(Usuario.id).with_for_update().populate_existing().first()
            if anchor is None:
                return None, 'No hay usuarios para reservar', 409
            result = function(*args, **kwargs)
            if result[1]:
                db.session.rollback()
            return result
        except SQLAlchemyError:
            db.session.rollback()
            return None, 'No se pudo reservar ese cupo. Actualiza la disponibilidad.', 409
    return locked


def duration(service):
    return max(int(service.duracion_estimada or 60), 1) if service else 60


def slot_status(fecha, hora, servicio_id=None, vehiculo_id=None, mecanico_id=None, excluding=None, locking=False):
    service = db.session.get(Servicio, servicio_id) if servicio_id else None
    start = datetime.combine(fecha, hora)
    end = start + timedelta(minutes=duration(service))
    if start <= now_local() or hora.hour < 8 or hora.minute or hora.second or end > datetime.combine(fecha, datetime.min.time()).replace(hour=19):
        return False, None
    mechanics_query = Usuario.query.filter_by(rol='mecanico', estado='activo').order_by(Usuario.id)
    if locking:
        mechanics_query = mechanics_query.with_for_update()
    mechanics = [row.id for row in mechanics_query.all()]
    if mecanico_id and mecanico_id not in mechanics:
        return False, None
    query = Cita.query.filter(Cita.fecha == fecha)
    if excluding:
        query = query.filter(Cita.id != excluding)
    if locking:
        query = query.with_for_update().populate_existing()
    appointments = query.all()
    # Existing unique keys include cancelled rows. Never delete/rewrite their
    # history just to reuse an exact vehicle/time pair.
    cancelled_exact = [] if column_exists('citas', 'cupo_activo') else [row for row in appointments if row.estado == 'cancelada' and row.hora == hora]
    if vehiculo_id and any(row.vehiculo_id == vehiculo_id for row in cancelled_exact):
        return False, None
    overlapping = []
    for appointment in appointments:
        if appointment.estado == 'cancelada':
            continue
        other_start = datetime.combine(appointment.fecha, appointment.hora)
        other_end = other_start + timedelta(minutes=duration(appointment.servicio))
        if start < other_end and other_start < end:
            overlapping.append(appointment)
    if vehiculo_id and any(row.vehiculo_id == vehiculo_id for row in overlapping):
        return False, None
    # Unassigned legacy bookings consume workshop capacity too.
    reserved = {row.mecanico_id for row in overlapping if row.mecanico_id is not None}
    free = [value for value in mechanics if value not in reserved]
    unassigned = sum(row.mecanico_id is None for row in overlapping)
    if mecanico_id:
        if any(row.mecanico_id == mecanico_id for row in cancelled_exact):
            return False, None
        return mecanico_id in free and len(free) > unassigned, mecanico_id
    if mechanics:
        eligible = [value for value in free if value not in {row.mecanico_id for row in cancelled_exact}]
        return len(free) > unassigned, eligible[0] if len(free) > unassigned and eligible else None
    return not overlapping, None
