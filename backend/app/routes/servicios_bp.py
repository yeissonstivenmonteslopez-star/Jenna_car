from decimal import Decimal
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Servicio, Cita, OrdenServicio
from ..services.security import jwt_required
from ..utils import service_to_dict

servicios_bp = Blueprint('servicios', __name__)


@servicios_bp.get('')
def listar_servicios():
    query = request.args.get('q', '').strip()
    estado = request.args.get('estado', '').strip()
    base_query = Servicio.query

    if query:
        base_query = base_query.filter(
            (Servicio.nombre.ilike(f'%{query}%')) |
            (Servicio.descripcion.ilike(f'%{query}%'))
        )
    base_query = base_query.filter(Servicio.estado == (estado or 'activo'))

    services = base_query.order_by(Servicio.id).all()
    return jsonify({
        'data': [
            {
                'id': s.id,
                'name': s.nombre,
                'description': s.descripcion,
                'price': float(s.precio),
                'duration_minutes': s.duracion_estimada,
            }
            for s in services
        ]
    })


@servicios_bp.get('/<int:servicio_id>')
def obtener_servicio(servicio_id: int):
    from ..models import Servicio as ServicioModel
    service = db.session.get(ServicioModel, servicio_id)
    if not service:
        return jsonify({'error': 'Servicio no encontrado'}), 404
    return jsonify({
        'data': {
            'id': service.id,
            'name': service.nombre,
            'description': service.descripcion,
            'price': float(service.precio),
            'duration_minutes': service.duracion_estimada,
        }
    })


@servicios_bp.get('/admin')
@jwt_required(roles=['admin'])
def admin_servicios():
    query = request.args.get('q', '').strip()
    estado = request.args.get('estado', '').strip()
    base_query = Servicio.query
    if query:
        base_query = base_query.filter(
            (Servicio.nombre.ilike(f'%{query}%'))
            | (Servicio.descripcion.ilike(f'%{query}%'))
        )
    if estado:
        base_query = base_query.filter(Servicio.estado == estado)
    services = base_query.order_by(Servicio.id.desc()).all()
    return jsonify({'data': [service_to_dict(service) for service in services]})


@servicios_bp.get('/admin/<int:servicio_id>')
@jwt_required(roles=['admin'])
def admin_servicio_detalle(servicio_id):
    service = db.session.get(Servicio, servicio_id)
    if not service:
        return jsonify({'error': 'Servicio no encontrado'}), 404
    return jsonify({'data': service_to_dict(service)})


@servicios_bp.post('/admin')
@jwt_required(roles=['admin'])
def crear_servicio_admin():
    payload = request.get_json(silent=True) or {}
    nombre = (payload.get('nombre') or '').strip()
    descripcion = (payload.get('descripcion') or '').strip() or None
    if not nombre:
        return jsonify({'error': 'El nombre es obligatorio'}), 400
    if payload.get('precio') is None:
        return jsonify({'error': 'El precio es obligatorio'}), 400
    if payload.get('duracion_estimada') is None:
        return jsonify({'error': 'La duración estimada es obligatoria'}), 400
    try:
        precio = Decimal(str(payload['precio']))
        duracion = int(payload['duracion_estimada'])
    except (ValueError, TypeError, ArithmeticError):
        return jsonify({'error': 'El precio y la duración deben ser válidos'}), 400
    estado = (payload.get('estado') or 'activo').strip()
    if precio < 0 or duracion < 0:
        return jsonify({'error': 'El precio y la duración no pueden ser negativos'}), 400
    if estado not in {'activo', 'inactivo'}:
        return jsonify({'error': 'Estado inválido'}), 400
    if Servicio.query.filter(Servicio.nombre.ilike(nombre)).first():
        return jsonify({'error': 'Ya existe un servicio con ese nombre'}), 409
    service = Servicio(nombre=nombre, descripcion=descripcion, precio=precio, duracion_estimada=duracion, estado=estado)
    db.session.add(service)
    db.session.commit()
    return jsonify({'data': service_to_dict(service)}), 201


@servicios_bp.put('/admin/<int:servicio_id>')
@jwt_required(roles=['admin'])
def actualizar_servicio_admin(servicio_id):
    service = db.session.get(Servicio, servicio_id)
    if not service:
        return jsonify({'error': 'Servicio no encontrado'}), 404
    payload = request.get_json(silent=True) or {}
    if 'nombre' in payload:
        nombre = (payload.get('nombre') or '').strip()
        if not nombre:
            return jsonify({'error': 'El nombre es obligatorio'}), 400
        if Servicio.query.filter(Servicio.id != service.id, Servicio.nombre.ilike(nombre)).first():
            return jsonify({'error': 'Ya existe un servicio con ese nombre'}), 409
        service.nombre = nombre
    if 'descripcion' in payload:
        service.descripcion = (payload.get('descripcion') or '').strip() or None
    if 'precio' in payload:
        try:
            service.precio = Decimal(str(payload['precio']))
        except (ValueError, TypeError, ArithmeticError):
            return jsonify({'error': 'El precio debe ser válido'}), 400
        if service.precio < 0:
            return jsonify({'error': 'El precio no puede ser negativo'}), 400
    if 'duracion_estimada' in payload:
        try:
            service.duracion_estimada = int(payload['duracion_estimada'])
        except (ValueError, TypeError):
            return jsonify({'error': 'La duración estimada debe ser válida'}), 400
        if service.duracion_estimada < 0:
            return jsonify({'error': 'La duración no puede ser negativa'}), 400
    if 'estado' in payload:
        if payload['estado'] not in {'activo', 'inactivo'}:
            return jsonify({'error': 'Estado inválido'}), 400
        service.estado = payload['estado']
    db.session.commit()
    return jsonify({'data': service_to_dict(service)})


@servicios_bp.delete('/admin/<int:servicio_id>')
@jwt_required(roles=['admin'])
def eliminar_servicio_admin(servicio_id):
    service = db.session.get(Servicio, servicio_id)
    if not service:
        return jsonify({'error': 'Servicio no encontrado'}), 404
    if Cita.query.filter_by(servicio_id=service.id).first() or OrdenServicio.query.filter_by(servicio_id=service.id).first():
        service.estado = 'inactivo'
        db.session.commit()
        return jsonify({'data': service_to_dict(service), 'message': 'Servicio desactivado porque tiene relaciones existentes.'})
    db.session.delete(service)
    db.session.commit()
    return jsonify({'message': 'Servicio eliminado correctamente.'})
