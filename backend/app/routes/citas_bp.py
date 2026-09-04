from datetime import datetime
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Vehiculo, Cliente, Cita, Servicio
from ..utils import validar_fecha_cita, validar_hora_cita, notificacion_por_usuario, cita_to_dict
from ..services.security import jwt_required

citas_bp = Blueprint('citas', __name__)


@citas_bp.post('')
@jwt_required()
def create_appointment():
    payload = request.get_json(silent=True) or {}
    usuario = request.current_user
    cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
    if not cliente:
        return jsonify({'error': 'El usuario no tiene perfil de cliente'}), 403

    vehiculo_id = payload.get('vehiculo_id')
    servicio_id = payload.get('servicio_id')
    fecha = payload.get('fecha')
    hora = payload.get('hora')
    if not all([vehiculo_id, servicio_id, fecha, hora]):
        return jsonify({'error': 'Vehículo, servicio, fecha y hora son obligatorios'}), 400

    vehiculo = Vehiculo.query.filter_by(id=vehiculo_id, cliente_id=cliente.id).first()
    if not vehiculo:
        return jsonify({'error': 'El vehículo no pertenece al usuario autenticado'}), 403
    servicio = db.session.get(Servicio, servicio_id)
    if not servicio:
        return jsonify({'error': 'Servicio no encontrado'}), 404
    if servicio.estado != 'activo':
        return jsonify({'error': 'El servicio seleccionado no está disponible'}), 409

    try:
        fecha_obj = validar_fecha_cita(fecha)
        hora_obj = validar_hora_cita(hora)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    if Cita.query.filter(
        Cita.fecha == fecha_obj,
        Cita.hora == hora_obj,
        Cita.estado != 'cancelada',
    ).first():
        return jsonify({'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'}), 409

    cita = Cita(
        cliente_id=cliente.id,
        vehiculo_id=vehiculo.id,
        servicio_id=servicio.id,
        fecha=fecha_obj,
        hora=hora_obj,
        motivo=payload.get('motivo') or payload.get('observaciones') or '',
        observaciones=payload.get('observaciones') or '',
        estado='pendiente',
    )
    db.session.add(cita)
    db.session.commit()
    notificacion_por_usuario(
        usuario_id=usuario.id,
        titulo='Cita agendada',
        mensaje=f'Tu cita del {fecha} a las {hora} ha sido registrada exitosamente.',
        tipo='cita',
        link=f'/citas/{cita.id}',
    )
    return jsonify({'data': {
        'id': cita.id,
        'cliente_id': cliente.id,
        'vehiculo_id': vehiculo.id,
        'servicio_id': servicio.id,
        'fecha': str(fecha),
        'hora': str(hora),
        'motivo': cita.motivo,
        'observaciones': cita.observaciones,
        'estado': cita.estado,
    }}), 201


@citas_bp.post('/disponibilidad')
@jwt_required()
def verificar_disponibilidad():
    payload = request.get_json(silent=True) or {}
    fecha = payload.get('fecha')
    hora = payload.get('hora')
    if not fecha or not hora:
        return jsonify({'error': 'Fecha y hora son obligatorias'}), 400
    try:
        fecha_obj = validar_fecha_cita(fecha)
        hora_obj = validar_hora_cita(hora)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    occupied = Cita.query.filter(
        Cita.fecha == fecha_obj,
        Cita.hora == hora_obj,
        Cita.estado != 'cancelada',
    ).first()
    if occupied:
        return jsonify({'data': False, 'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'})
    return jsonify({'data': True})


@citas_bp.get('/mis-citas')
@jwt_required()
def mis_citas():
    cliente = Cliente.query.filter_by(usuario_id=request.current_user.id).first()
    if not cliente:
        return jsonify({'error': 'El usuario no tiene perfil de cliente'}), 403
    citas = Cita.query.filter_by(cliente_id=cliente.id).order_by(Cita.fecha.desc(), Cita.hora.desc()).all()
    return jsonify({'data': [
        {
            'id': cita.id,
            'fecha': str(cita.fecha),
            'hora': str(cita.hora),
            'vehiculo': {
                'id': cita.vehiculo.id,
                'marca': cita.vehiculo.marca,
                'modelo': cita.vehiculo.modelo,
                'placa': cita.vehiculo.placa,
            },
            'servicio': {'id': cita.servicio.id, 'name': cita.servicio.nombre},
            'motivo': cita.motivo,
            'observaciones': cita.observaciones,
            'estado': cita.estado,
        }
        for cita in citas
    ]})


@citas_bp.get('/<int:cita_id>')
@jwt_required()
def detalle_cita(cita_id: int):
    usuario = request.current_user
    cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
    cita_query = Cita.query.filter_by(id=cita_id)
    if usuario.rol != 'admin':
        if not cliente:
            return jsonify({'error': 'Cita no encontrada'}), 404
        cita_query = cita_query.filter_by(cliente_id=cliente.id)
    cita = cita_query.first()
    if not cita:
        return jsonify({'error': 'Cita no encontrada'}), 404
    return jsonify({'data': {
        'id': cita.id,
        'cliente_id': cita.cliente_id,
        'vehiculo': {'id': cita.vehiculo.id, 'marca': cita.vehiculo.marca, 'modelo': cita.vehiculo.modelo, 'placa': cita.vehiculo.placa},
        'servicio': {'id': cita.servicio.id, 'name': cita.servicio.nombre},
        'fecha': str(cita.fecha),
        'hora': str(cita.hora),
        'motivo': cita.motivo,
        'observaciones': cita.observaciones,
        'estado': cita.estado,
    }})


@citas_bp.post('/<int:cita_id>/cancelar')
@jwt_required()
def cancelar_cita(cita_id: int):
    usuario = request.current_user
    cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
    cita_query = Cita.query.filter_by(id=cita_id)
    if usuario.rol != 'admin':
        if not cliente:
            return jsonify({'error': 'Cita no encontrada'}), 404
        cita_query = cita_query.filter_by(cliente_id=cliente.id)
    cita = cita_query.first()
    if not cita:
        return jsonify({'error': 'Cita no encontrada'}), 404
    if cita.estado == 'cancelada':
        return jsonify({'error': 'La cita ya está cancelada'}), 400
    cita.estado = 'cancelada'
    notificacion_por_usuario(
        usuario_id=cita.cliente.usuario_id,
        titulo='Cita cancelada',
        mensaje=f'Tu cita del {cita.fecha} a las {str(cita.hora)[:5]} fue cancelada.',
        tipo='cita',
        link=f'/citas/{cita.id}',
        do_commit=False,
    )
    db.session.commit()
    return jsonify({'data': {'id': cita.id, 'estado': cita.estado}})


def _admin_cita_payload(payload, cita=None):
    values = {}
    for field, model, message in [('cliente_id', Cliente, 'Cliente no encontrado'), ('vehiculo_id', Vehiculo, 'Vehículo no encontrado'), ('servicio_id', Servicio, 'Servicio no encontrado')]:
        if field in payload or cita is None:
            value = payload.get(field)
            if not value:
                return None, (f'El {field.replace("_id", "")} es obligatorio', 400)
            object_ = db.session.get(model, value)
            if not object_:
                return None, (message, 404)
            values[field] = object_.id
    cliente_id = values.get('cliente_id', cita.cliente_id if cita else None)
    vehiculo_id = values.get('vehiculo_id', cita.vehiculo_id if cita else None)
    vehicle = db.session.get(Vehiculo, vehiculo_id)
    if vehicle.cliente_id != cliente_id:
        return None, ('El vehículo no pertenece al cliente indicado', 400)
    if 'fecha' in payload or cita is None:
        try:
            values['fecha'] = datetime.strptime(str(payload.get('fecha')), '%Y-%m-%d').date()
        except (TypeError, ValueError):
            return None, ('La fecha debe tener formato YYYY-MM-DD', 400)
    if 'hora' in payload or cita is None:
        try:
            values['hora'] = validar_hora_cita(payload.get('hora'))
        except ValueError as exc:
            return None, (str(exc), 400)
    if 'estado' in payload:
        if payload['estado'] not in {'pendiente', 'confirmada', 'atendida', 'cancelada'}:
            return None, ('Estado inválido', 400)
        values['estado'] = payload['estado']
    elif cita is None:
        values['estado'] = 'pendiente'
    for field in ('motivo', 'observaciones'):
        if field in payload:
            values[field] = (payload[field] or '').strip() or None
    return values, None


@citas_bp.get('/admin')
@jwt_required(roles=['admin'])
def admin_citas():
    filters = {key: (request.args.get(key) or '').strip().lower() for key in ('q', 'cliente', 'vehiculo', 'fecha', 'estado')}
    if filters['fecha']:
        try:
            datetime.strptime(filters['fecha'], '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'La fecha debe tener formato YYYY-MM-DD'}), 400
    if filters['estado'] and filters['estado'] not in {'pendiente', 'confirmada', 'atendida', 'cancelada'}:
        return jsonify({'error': 'Estado inválido'}), 400
    matches = []
    for cita in Cita.query.order_by(Cita.fecha.desc(), Cita.hora.desc()).all():
        user, vehicle, service = cita.cliente.usuario, cita.vehiculo, cita.servicio
        customer_text = f'{user.nombre} {user.apellido} {user.email}'.lower()
        vehicle_text = f'{vehicle.placa} {vehicle.marca} {vehicle.modelo}'.lower()
        all_text = f'{customer_text} {vehicle_text} {service.nombre} {cita.estado} {cita.fecha} {cita.hora}'.lower()
        if filters['q'] and filters['q'] not in all_text: continue
        if filters['cliente'] and filters['cliente'] not in customer_text: continue
        if filters['vehiculo'] and filters['vehiculo'] not in vehicle_text: continue
        if filters['fecha'] and filters['fecha'] != str(cita.fecha): continue
        if filters['estado'] and filters['estado'] != cita.estado: continue
        matches.append(cita)
    return jsonify({'data': [cita_to_dict(cita) for cita in matches]})


@citas_bp.route('/admin/<int:cita_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required(roles=['admin'])
def admin_cita_detalle(cita_id):
    cita = db.session.get(Cita, cita_id)
    if not cita:
        return jsonify({'error': 'Cita no encontrada'}), 404
    if request.method == 'GET':
        return jsonify({'data': cita_to_dict(cita)})
    if request.method == 'DELETE':
        db.session.delete(cita)
        db.session.commit()
        return jsonify({'message': 'Cita eliminada correctamente.'})
    values, error = _admin_cita_payload(request.get_json(silent=True) or {}, cita)
    if error:
        return jsonify({'error': error[0]}), error[1]
    for field, value in values.items(): setattr(cita, field, value)
    if cita.estado != 'cancelada' and Cita.query.filter(Cita.id != cita.id, Cita.fecha == cita.fecha, Cita.hora == cita.hora, Cita.estado != 'cancelada').first():
        return jsonify({'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'}), 409
    db.session.commit()
    return jsonify({'data': cita_to_dict(cita)})


@citas_bp.post('/admin')
@jwt_required(roles=['admin'])
def crear_cita_admin():
    values, error = _admin_cita_payload(request.get_json(silent=True) or {})
    if error:
        return jsonify({'error': error[0]}), error[1]
    if values['estado'] != 'cancelada' and Cita.query.filter(Cita.fecha == values['fecha'], Cita.hora == values['hora'], Cita.estado != 'cancelada').first():
        return jsonify({'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'}), 409
    cita = Cita(**values)
    db.session.add(cita)
    db.session.commit()
    return jsonify({'data': cita_to_dict(cita)}), 201


@citas_bp.put('/admin/<int:cita_id>/estado')
@jwt_required(roles=['admin'])
def actualizar_estado_cita(cita_id):
    cita = db.session.get(Cita, cita_id)
    estado = (request.get_json(silent=True) or {}).get('estado')
    if not cita:
        return jsonify({'error': 'Cita no encontrada'}), 404
    if estado not in {'pendiente', 'confirmada', 'atendida', 'cancelada'}:
        return jsonify({'error': 'Estado inválido'}), 400
    cita.estado = estado
    db.session.commit()
    return jsonify({'data': cita_to_dict(cita)})
