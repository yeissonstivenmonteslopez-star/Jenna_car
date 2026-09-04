from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Vehiculo, Cliente, Usuario, Cita, OrdenTrabajo
from ..utils import validar_placa, vehicle_to_dict
from ..services.security import jwt_required

vehiculos_bp = Blueprint('vehiculos', __name__)


@vehiculos_bp.get('')
@jwt_required()
def mis_vehiculos():
    cliente = Cliente.query.filter_by(usuario_id=request.current_user.id).first()
    if not cliente:
        return jsonify({'data': []})

    vehiculos = Vehiculo.query.filter_by(cliente_id=cliente.id).order_by(Vehiculo.id.desc()).all()
    return jsonify({'data': [vehicle_to_dict(vehiculo) for vehiculo in vehiculos]})


@vehiculos_bp.post('')
@jwt_required()
def crear_vehiculo_cliente():
    payload = request.get_json(silent=True) or {}
    cliente = Cliente.query.filter_by(usuario_id=request.current_user.id).first()

    if not cliente:
        return jsonify({'error': 'El usuario no tiene perfil de cliente'}), 403

    try:
        placa = validar_placa(payload.get('placa'))
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    marca = (payload.get('marca') or '').strip()
    modelo = (payload.get('modelo') or '').strip()
    if not marca or not modelo:
        return jsonify({'error': 'La marca y modelo son obligatorios'}), 400

    tipo_combustible = (payload.get('tipo_combustible') or 'gasolina').strip()
    valid_fuels = {'gasolina', 'diesel', 'hibrido', 'electrico', 'gas'}
    if tipo_combustible not in valid_fuels:
        return jsonify({'error': 'Tipo de combustible inválido'}), 400

    try:
        kilometraje = int(payload.get('kilometraje', 0) or 0)
    except (TypeError, ValueError):
        return jsonify({'error': 'El kilometraje debe ser un número válido'}), 400
    if kilometraje < 0:
        return jsonify({'error': 'El kilometraje no puede ser negativo'}), 400

    if Vehiculo.query.filter_by(placa=placa).first():
        return jsonify({'error': 'Ya existe un vehículo con esa placa'}), 409

    anio = payload.get('anio')
    anio_int = None
    if anio not in (None, ''):
        try:
            anio_int = int(anio)
        except (TypeError, ValueError):
            return jsonify({'error': 'El año debe ser un número válido'}), 400
        if anio_int < 1900 or anio_int > 2100:
            return jsonify({'error': 'El año no es válido'}), 400

    vehiculo = Vehiculo(
        cliente_id=cliente.id,
        placa=placa,
        marca=marca,
        modelo=modelo,
        anio=anio_int,
        color=(payload.get('color') or '').strip() or None,
        kilometraje=kilometraje,
        tipo_combustible=tipo_combustible,
        estado='activo',
    )
    db.session.add(vehiculo)
    db.session.commit()
    return jsonify({'data': vehicle_to_dict(vehiculo)}), 201


@vehiculos_bp.get('/admin')
@jwt_required(roles=['admin'])
def admin_vehiculos():
    query = request.args.get('q', '').strip()
    base_query = Vehiculo.query.join(Cliente).join(Usuario)
    if query:
        base_query = base_query.filter(
            (Vehiculo.placa.ilike(f'%{query}%')) |
            (Vehiculo.marca.ilike(f'%{query}%')) |
            (Vehiculo.modelo.ilike(f'%{query}%')) |
            (Usuario.nombre.ilike(f'%{query}%')) |
            (Usuario.apellido.ilike(f'%{query}%'))
        )
    vehicles = base_query.order_by(Vehiculo.id.desc()).all()
    return jsonify({'data': [vehicle_to_dict(vehicle) for vehicle in vehicles]})


@vehiculos_bp.get('/admin/<int:vehiculo_id>')
@jwt_required(roles=['admin'])
def admin_vehiculo_detalle(vehiculo_id):
    vehicle = db.session.get(Vehiculo, vehiculo_id)
    if not vehicle:
        return jsonify({'error': 'Vehículo no encontrado'}), 404
    return jsonify({'data': vehicle_to_dict(vehicle)})


def _vehicle_payload(payload, vehicle=None):
    cliente_id = payload.get('cliente_id', vehicle.cliente_id if vehicle else None)
    if not cliente_id:
        raise ValueError('El cliente es obligatorio')
    cliente = db.session.get(Cliente, cliente_id)
    if not cliente:
        return None, ('Cliente no encontrado', 404)
    values = {'cliente_id': cliente.id}
    if 'placa' in payload or not vehicle:
        try:
            placa = validar_placa(payload.get('placa'))
        except ValueError as exc:
            return None, (str(exc), 400)
        duplicate = Vehiculo.query.filter(Vehiculo.placa == placa)
        if vehicle:
            duplicate = duplicate.filter(Vehiculo.id != vehicle.id)
        if duplicate.first():
            return None, ('Ya existe un vehículo con esa placa', 409)
        values['placa'] = placa
    for field, label in [('marca', 'marca'), ('modelo', 'modelo')]:
        if field in payload or not vehicle:
            value = (payload.get(field) or '').strip()
            if not value:
                return None, (f'La {label} es obligatoria', 400)
            values[field] = value
    if 'anio' in payload or not vehicle:
        anio = payload.get('anio')
        if anio in (None, ''):
            values['anio'] = None
        else:
            try:
                values['anio'] = int(anio)
            except (TypeError, ValueError):
                return None, ('El año debe ser un número válido', 400)
            if not 1900 <= values['anio'] <= 2100:
                return None, ('El año no es válido', 400)
    if 'color' in payload:
        values['color'] = (payload.get('color') or '').strip() or None
    if 'kilometraje' in payload or not vehicle:
        try:
            values['kilometraje'] = int(payload.get('kilometraje', 0))
        except (TypeError, ValueError):
            return None, ('El kilometraje debe ser un número válido', 400)
        if values['kilometraje'] < 0:
            return None, ('El kilometraje no puede ser negativo', 400)
    if 'tipo_combustible' in payload or not vehicle:
        fuel = (payload.get('tipo_combustible') or 'gasolina').strip()
        if fuel not in {'gasolina', 'diesel', 'hibrido', 'electrico', 'gas'}:
            return None, ('Tipo de combustible inválido', 400)
        values['tipo_combustible'] = fuel
    if 'estado' in payload or not vehicle:
        estado = (payload.get('estado') or 'activo').strip()
        if estado not in {'activo', 'en_mantenimiento', 'inactivo'}:
            return None, ('Estado inválido', 400)
        values['estado'] = estado
    return values, None


@vehiculos_bp.post('/admin')
@jwt_required(roles=['admin'])
def crear_vehiculo_admin():
    values, error = _vehicle_payload(request.get_json(silent=True) or {})
    if error:
        return jsonify({'error': error[0]}), error[1]
    vehicle = Vehiculo(**values)
    db.session.add(vehicle)
    db.session.commit()
    return jsonify({'data': vehicle_to_dict(vehicle)}), 201


@vehiculos_bp.put('/admin/<int:vehiculo_id>')
@jwt_required(roles=['admin'])
def actualizar_vehiculo_admin(vehiculo_id):
    vehicle = db.session.get(Vehiculo, vehiculo_id)
    if not vehicle:
        return jsonify({'error': 'Vehículo no encontrado'}), 404
    values, error = _vehicle_payload(request.get_json(silent=True) or {}, vehicle)
    if error:
        return jsonify({'error': error[0]}), error[1]
    for field, value in values.items():
        setattr(vehicle, field, value)
    db.session.commit()
    return jsonify({'data': vehicle_to_dict(vehicle)})


@vehiculos_bp.delete('/admin/<int:vehiculo_id>')
@jwt_required(roles=['admin'])
def eliminar_vehiculo_admin(vehiculo_id):
    vehicle = db.session.get(Vehiculo, vehiculo_id)
    if not vehicle:
        return jsonify({'error': 'Vehículo no encontrado'}), 404
    if db.session.query(Cita.id).filter_by(vehiculo_id=vehicle.id).first() or db.session.query(OrdenTrabajo.id).filter_by(vehiculo_id=vehicle.id).first():
        vehicle.estado = 'inactivo'
        db.session.commit()
        return jsonify({'data': vehicle_to_dict(vehicle), 'message': 'Vehículo desactivado porque tiene relaciones existentes.'})
    db.session.delete(vehicle)
    db.session.commit()
    return jsonify({'message': 'Vehículo eliminado correctamente.'})
