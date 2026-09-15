"""Appointment queries, validation, persistence, and domain serialization."""
from datetime import datetime
from ..extensions import db
from ..models import Cita, Cliente, Servicio, Vehiculo
from ..schemas.serializers import cita_to_dict
from ..utils.notifications import notificacion_por_usuario
from ..utils.validation import validar_fecha_cita, validar_hora_cita

STATES = {'pendiente', 'confirmada', 'atendida', 'cancelada'}


def _error(message, status):
    return None, message, status


def create_for_user(user, payload):
    cliente = Cliente.query.filter_by(usuario_id=user.id).first()
    if not cliente:
        return _error('El usuario no tiene perfil de cliente', 403)
    if not all(payload.get(key) for key in ('vehiculo_id', 'servicio_id', 'fecha', 'hora')):
        return _error('Vehículo, servicio, fecha y hora son obligatorios', 400)
    vehiculo = Vehiculo.query.filter_by(id=payload['vehiculo_id'], cliente_id=cliente.id).first()
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
    if occupied(fecha, hora):
        return _error('La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.', 409)
    cita = Cita(cliente_id=cliente.id, vehiculo_id=vehiculo.id, servicio_id=servicio.id, fecha=fecha, hora=hora, motivo=payload.get('motivo') or payload.get('observaciones') or '', observaciones=payload.get('observaciones') or '', estado='pendiente')
    db.session.add(cita)
    db.session.commit()
    notificacion_por_usuario(usuario_id=user.id, titulo='Cita agendada', mensaje=f'Tu cita del {payload["fecha"]} a las {payload["hora"]} ha sido registrada exitosamente.', tipo='cita', link=f'/citas/{cita.id}')
    return {'id': cita.id, 'cliente_id': cliente.id, 'vehiculo_id': vehiculo.id, 'servicio_id': servicio.id, 'fecha': str(payload['fecha']), 'hora': str(payload['hora']), 'motivo': cita.motivo, 'observaciones': cita.observaciones, 'estado': cita.estado}, None, 201


def parse_slot(payload):
    if not payload.get('fecha') or not payload.get('hora'):
        return None, 'Fecha y hora son obligatorias', 400
    try:
        return (validar_fecha_cita(payload['fecha']), validar_hora_cita(payload['hora'])), None, None
    except ValueError as exc:
        return None, str(exc), 400


def occupied(fecha, hora, excluding=None):
    query = Cita.query.filter(Cita.fecha == fecha, Cita.hora == hora, Cita.estado != 'cancelada')
    if excluding:
        query = query.filter(Cita.id != excluding)
    return query.first() is not None


def user_appointments(user):
    cliente = Cliente.query.filter_by(usuario_id=user.id).first()
    if not cliente:
        return None, 'El usuario no tiene perfil de cliente', 403
    return [{'id': c.id, 'fecha': str(c.fecha), 'hora': str(c.hora), 'vehiculo': {'id': c.vehiculo.id, 'marca': c.vehiculo.marca, 'modelo': c.vehiculo.modelo, 'placa': c.vehiculo.placa}, 'servicio': {'id': c.servicio.id, 'name': c.servicio.nombre}, 'motivo': c.motivo, 'observaciones': c.observaciones, 'estado': c.estado} for c in Cita.query.filter_by(cliente_id=cliente.id).order_by(Cita.fecha.desc(), Cita.hora.desc()).all()], None, None


def get_for_user(user, cita_id):
    cliente = Cliente.query.filter_by(usuario_id=user.id).first()
    query = Cita.query.filter_by(id=cita_id)
    if user.rol != 'admin':
        if not cliente:
            return None, 'Cita no encontrada', 404
        query = query.filter_by(cliente_id=cliente.id)
    cita = query.first()
    return (cita_to_dict(cita), None, None) if cita else _error('Cita no encontrada', 404)


def cancel(user, cita_id):
    cliente = Cliente.query.filter_by(usuario_id=user.id).first()
    query = Cita.query.filter_by(id=cita_id)
    if user.rol != 'admin':
        if not cliente:
            return _error('Cita no encontrada', 404)
        query = query.filter_by(cliente_id=cliente.id)
    cita = query.first()
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
    for field, model, message in [('cliente_id', Cliente, 'Cliente no encontrado'), ('vehiculo_id', Vehiculo, 'Vehículo no encontrado'), ('servicio_id', Servicio, 'Servicio no encontrado')]:
        if field in payload or cita is None:
            value = payload.get(field)
            if not value: return None, f'El {field.replace("_id", "")} es obligatorio', 400
            obj = db.session.get(model, value)
            if not obj: return None, message, 404
            values[field] = obj.id
    cliente_id = values.get('cliente_id', cita.cliente_id if cita else None); vehiculo_id = values.get('vehiculo_id', cita.vehiculo_id if cita else None)
    vehicle = db.session.get(Vehiculo, vehiculo_id)
    if vehicle.cliente_id != cliente_id: return None, 'El vehículo no pertenece al cliente indicado', 400
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
    return values, None, None


def admin_get(cita_id): return db.session.get(Cita, cita_id)

def save_admin(cita, payload, creating=False):
    values, error, status = admin_payload(payload, cita)
    if error: return None, error, status
    if values.get('estado', cita.estado if cita else 'pendiente') != 'cancelada' and occupied(values.get('fecha', cita.fecha if cita else None), values.get('hora', cita.hora if cita else None), None if creating else cita.id): return None, 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.', 409
    if creating: cita = Cita(**values); db.session.add(cita)
    else:
        for field, value in values.items(): setattr(cita, field, value)
    db.session.commit()
    return cita_to_dict(cita), None, None


def set_state(cita_id, state):
    cita = db.session.get(Cita, cita_id)
    if not cita: return None, 'Cita no encontrada', 404
    if state not in STATES: return None, 'Estado inválido', 400
    cita.estado = state; db.session.commit()
    return cita_to_dict(cita), None, None


def delete_admin(cita):
    db.session.delete(cita)
    db.session.commit()
