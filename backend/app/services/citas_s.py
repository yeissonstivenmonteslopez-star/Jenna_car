"""Appointment queries, validation, persistence, and domain serialization."""
from datetime import datetime
from html import escape
from ..extensions import db
from ..models import Cita, Servicio, Usuario, Vehiculo
from ..schemas.serializers import cita_to_dict
from ..utils.email import enviar_correo
from ..utils.notifications import notificacion_por_usuario
from ..utils.validation import validar_fecha_cita, validar_hora_cita
from .appointment_slots import serialize_booking, slot_status

STATES = {'pendiente', 'confirmada', 'atendida', 'cancelada'}


def _error(message, status):
    return None, message, status


def _send_appointment_confirmation(user, vehicle, service, fecha, hora):
        if not user or not user.email:
                return
        name = escape(f'{user.nombre} {user.apellido}')
        vehicle_name = escape(f'{vehicle.marca} {vehicle.modelo} ({vehicle.placa})')
        service_name = escape(service.nombre)
        date_label = escape(fecha.strftime('%d/%m/%Y'))
        time_label = escape(str(hora)[:5])
        message = f'''<div style="font-family:Arial,sans-serif;color:#171717;max-width:560px;margin:0 auto;padding:24px">
            <p style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#b52d2d">JENNA CAR</p>
            <h1 style="font-size:24px;margin:20px 0 8px">Cita agendada</h1>
            <p>Hola {name}, recibimos tu solicitud de servicio.</p>
            <table style="width:100%;border-collapse:collapse;margin:24px 0">
                <tr><td style="padding:10px 0;color:#666">Servicio</td><td style="padding:10px 0;text-align:right;font-weight:bold">{service_name}</td></tr>
                <tr><td style="padding:10px 0;color:#666">Vehículo</td><td style="padding:10px 0;text-align:right;font-weight:bold">{vehicle_name}</td></tr>
                <tr><td style="padding:10px 0;color:#666">Fecha</td><td style="padding:10px 0;text-align:right;font-weight:bold">{date_label}</td></tr>
                <tr><td style="padding:10px 0;color:#666">Hora</td><td style="padding:10px 0;text-align:right;font-weight:bold">{time_label}</td></tr>
            </table>
            <p style="font-size:13px;color:#666">Te avisaremos si necesitamos confirmar algún detalle.</p>
        </div>'''
        enviar_correo(user.email, 'Confirmación de cita | Jenna Car', message)


@serialize_booking
def create_for_user(user, payload):
    if not all(payload.get(key) for key in ('vehiculo_id', 'servicio_id', 'fecha', 'hora')):
        return _error('Vehículo, servicio, fecha y hora son obligatorios', 400)
    vehiculo = Vehiculo.query.filter_by(id=payload['vehiculo_id'], usuario_id=user.id).first()
    if not vehiculo:
        return _error('El vehículo no pertenece al usuario autenticado', 403)
    servicio = db.session.get(Servicio, payload['servicio_id'])
    if not servicio:
        return _error('Servicio no encontrado', 404)
    if servicio.estado != 'activo':
        return _error('El servicio seleccionado no está disponible', 409)
    try:
        fecha = validar_fecha_cita(payload['fecha'])
        hora = validar_hora_cita(payload['hora'])
    except ValueError as exc:
        return _error(str(exc), 400)
    available, mechanic_id = slot_status(fecha, hora, servicio.id, vehiculo.id, payload.get('mecanico_id'), locking=True)
    if not available:
        return _error('La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.', 409)
    cita = Cita(vehiculo_id=vehiculo.id, servicio_id=servicio.id, fecha=fecha, hora=hora, motivo=payload.get('motivo') or payload.get('observaciones') or '', observaciones=payload.get('observaciones') or '', estado='pendiente')
    db.session.add(cita)
    cita.mecanico_id = mechanic_id
    db.session.commit()
    notificacion_por_usuario(usuario_id=user.id, titulo='Cita agendada', mensaje=f'Tu cita del {payload["fecha"]} a las {payload["hora"]} ha sido registrada exitosamente.', tipo='cita', link=f'/citas/{cita.id}')
    _send_appointment_confirmation(user, vehiculo, servicio, fecha, hora)
    return {'id': cita.id, 'cliente_id': user.id, 'vehiculo_id': vehiculo.id, 'servicio_id': servicio.id, 'fecha': str(payload['fecha']), 'hora': str(payload['hora']), 'motivo': cita.motivo, 'observaciones': cita.observaciones, 'estado': cita.estado}, None, 201


def parse_slot(payload):
    if not payload.get('fecha') or not payload.get('hora'):
        return None, 'Fecha y hora son obligatorias', 400
    try:
        return (validar_fecha_cita(payload['fecha']), validar_hora_cita(payload['hora'])), None, None
    except ValueError as exc:
        return None, str(exc), 400


def occupied(fecha, hora, excluding=None):
    return not slot_status(fecha, hora, excluding=excluding)[0]


def available_times(fecha_value, servicio_id=None, vehiculo_id=None, mecanico_id=None, detailed=False):
    try:
        fecha = validar_fecha_cita(fecha_value)
    except ValueError as exc:
        return None, str(exc), 400
    slots = [datetime.strptime(f'{hour:02d}:00', '%H:%M').time() for hour in range(8, 19)]
    if servicio_id:
        service = db.session.get(Servicio, servicio_id)
        if not service or service.estado != 'activo':
            return None, 'Servicio no disponible', 400
    result = [{'hora': slot.strftime('%H:%M'), 'disponible': slot_status(fecha, slot, servicio_id, vehiculo_id, mecanico_id)[0]} for slot in slots]
    return (result if detailed else [item['hora'] for item in result if item['disponible']]), None, None


def user_appointments(user):
    citas = Cita.query.join(Cita.vehiculo).filter(Vehiculo.usuario_id == user.id).order_by(Cita.fecha.desc(), Cita.hora.desc()).all()
    return [{'id': c.id, 'fecha': str(c.fecha), 'hora': str(c.hora), 'vehiculo': {'id': c.vehiculo.id, 'marca': c.vehiculo.marca, 'modelo': c.vehiculo.modelo, 'placa': c.vehiculo.placa}, 'servicio': {'id': c.servicio.id, 'name': c.servicio.nombre}, 'motivo': c.motivo, 'observaciones': c.observaciones, 'estado': c.estado, 'mecanico_id': c.mecanico_id} for c in citas], None, None


@serialize_booking
def assign_mechanic_to_appointment(cita_id, mecanico_id):
    """Asignar un mecanico a una cita. Solo admin o el mecanico propio puede hacerlo."""
    from ..models import Usuario
    cita = Cita.query.filter_by(id=cita_id).with_for_update().populate_existing().first()
    if not cita: return None, 'Cita no encontrada', 404
    if mecanico_id in (None, ''):
        cita.mecanico_id = None
        db.session.commit()
        return cita_to_dict(cita), None, None
    mecanico = db.session.get(Usuario, mecanico_id)
    if not mecanico: return None, 'Mecánico no encontrado', 404
    if mecanico.rol != 'mecanico': return None, 'El usuario no tiene rol de mecánico', 400
    if cita.estado != 'cancelada' and not slot_status(cita.fecha, cita.hora, cita.servicio_id, cita.vehiculo_id, mecanico.id, cita.id, locking=True)[0]:
        return None, 'El mecánico no está disponible para ese intervalo', 409
    cita.mecanico_id = mecanico.id
    db.session.commit()
    return cita_to_dict(cita), None, None


def get_for_user(user, cita_id):
    query = Cita.query.filter_by(id=cita_id)
    if user.rol != 'admin':
        query = query.join(Cita.vehiculo).filter(Vehiculo.usuario_id == user.id)
    cita = query.first()
    return (cita_to_dict(cita), None, None) if cita else _error('Cita no encontrada', 404)


@serialize_booking
def cancel(user, cita_id):
    query = Cita.query.filter_by(id=cita_id)
    if user.rol != 'admin':
        query = query.join(Cita.vehiculo).filter(Vehiculo.usuario_id == user.id)
    cita = query.with_for_update().populate_existing().first()
    if not cita:
        return _error('Cita no encontrada', 404)
    if cita.estado == 'cancelada':
        return _error('La cita ya está cancelada', 400)
    cita.estado = 'cancelada'
    notificacion_por_usuario(usuario_id=cita.cliente.usuario_id, titulo='Cita cancelada', mensaje=f'Tu cita del {cita.fecha} a las {str(cita.hora)[:5]} fue cancelada.', tipo='cita', link=f'/citas/{cita.id}', do_commit=False)
    db.session.commit()
    return {'id': cita.id, 'estado': cita.estado}, None, None


def admin_list(filters):
    for key in ('fecha',):
        if filters[key]:
            try: datetime.strptime(filters[key], '%Y-%m-%d')
            except ValueError: return None, 'La fecha debe tener formato YYYY-MM-DD', 400
    if filters['estado'] and filters['estado'] not in STATES:
        return None, 'Estado inválido', 400
    matches = []
    for cita in Cita.query.order_by(Cita.fecha.desc(), Cita.hora.desc()).all():
        user, vehicle, service = cita.cliente.usuario, cita.vehiculo, cita.servicio
        customer = f'{user.nombre} {user.apellido} {user.email}'.lower(); vehicle_text = f'{vehicle.placa} {vehicle.marca} {vehicle.modelo}'.lower(); all_text = f'{customer} {vehicle_text} {service.nombre} {cita.estado} {cita.fecha} {cita.hora}'.lower()
        if filters['q'] and filters['q'] not in all_text or filters['cliente'] and filters['cliente'] not in customer or filters['vehiculo'] and filters['vehiculo'] not in vehicle_text or filters['fecha'] and filters['fecha'] != str(cita.fecha) or filters['estado'] and filters['estado'] != cita.estado: continue
        matches.append(cita_to_dict(cita))
    return matches, None, None


def admin_payload(payload, cita=None):
    values = {}
    for field, model, message in [('vehiculo_id', Vehiculo, 'Vehículo no encontrado'), ('servicio_id', Servicio, 'Servicio no encontrado')]:
        if field in payload or cita is None:
            value = payload.get(field)
            if not value: return None, f'El {field.replace("_id", "")} es obligatorio', 400
            obj = db.session.get(model, value)
            if not obj: return None, message, 404
            values[field] = obj.id
    cliente_id = payload.get('cliente_id', cita.cliente_id if cita else None)
    vehiculo_id = values.get('vehiculo_id', cita.vehiculo_id if cita else None)
    vehicle = db.session.get(Vehiculo, vehiculo_id)
    if not vehicle: return None, 'Vehículo no encontrado', 404
    if cliente_id is not None and vehicle.usuario_id != int(cliente_id):
        return None, 'El vehículo no pertenece al cliente indicado', 400
    if 'fecha' in payload or cita is None:
        try: values['fecha'] = datetime.strptime(str(payload.get('fecha')), '%Y-%m-%d').date()
        except (TypeError, ValueError): return None, 'La fecha debe tener formato YYYY-MM-DD', 400
    if 'hora' in payload or cita is None:
        try: values['hora'] = validar_hora_cita(payload.get('hora'))
        except ValueError as exc: return None, str(exc), 400
    if 'estado' in payload:
        if payload['estado'] not in STATES: return None, 'Estado inválido', 400
        values['estado'] = payload['estado']
    elif cita is None: values['estado'] = 'pendiente'
    for field in ('motivo', 'observaciones'):
        if field in payload: values[field] = (payload[field] or '').strip() or None
    if 'mecanico_id' in payload:
        mechanic_id = payload.get('mecanico_id')
        mechanic = db.session.get(Usuario, mechanic_id) if mechanic_id else None
        if mechanic_id and (not mechanic or mechanic.rol != 'mecanico'):
            return None, 'Mecánico no encontrado', 404
        values['mecanico_id'] = mechanic.id if mechanic else None
    return values, None, None


def admin_get(cita_id): return db.session.get(Cita, cita_id)

@serialize_booking
def save_admin(cita, payload, creating=False):
    if cita is not None:
        db.session.refresh(cita)
    values, error, status = admin_payload(payload, cita)
    if error: return None, error, status
    if values.get('estado', cita.estado if cita else 'pendiente') != 'cancelada':
        available, mechanic_id = slot_status(values.get('fecha', cita.fecha if cita else None), values.get('hora', cita.hora if cita else None), values.get('servicio_id', cita.servicio_id if cita else None), values.get('vehiculo_id', cita.vehiculo_id if cita else None), values.get('mecanico_id', cita.mecanico_id if cita else None), None if creating else cita.id, locking=True)
        if not available:
            return None, 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.', 409
        values['mecanico_id'] = mechanic_id
    if creating: cita = Cita(**values); db.session.add(cita)
    else:
        for field, value in values.items(): setattr(cita, field, value)
    db.session.commit()
    if creating and cita.cliente:
        _send_appointment_confirmation(cita.cliente.usuario, cita.vehiculo, cita.servicio, cita.fecha, cita.hora)
    return cita_to_dict(cita), None, 201 if creating else None


@serialize_booking
def set_state(cita_id, state):
    cita = Cita.query.filter_by(id=cita_id).with_for_update().populate_existing().first()
    if not cita: return None, 'Cita no encontrada', 404
    if state not in STATES: return None, 'Estado inválido', 400
    if state in {'pendiente', 'confirmada'} and not slot_status(cita.fecha, cita.hora, cita.servicio_id, cita.vehiculo_id, cita.mecanico_id, cita.id, locking=True)[0]:
        return None, 'El cupo ya no está disponible', 409
    cita.estado = state; db.session.commit()
    return cita_to_dict(cita), None, None


def delete_admin(cita):
    db.session.delete(cita)
    db.session.commit()
