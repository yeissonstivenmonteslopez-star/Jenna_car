from flask import Blueprint, request, jsonify
from ..auth.decorators import jwt_required
from ..services import mechanic_s as mechanic_service

mechanic_bp = Blueprint('mechanic', __name__)


@mechanic_bp.post('/orders/<int:order_id>/revise-quote')
@jwt_required(roles=['mecanico'])
def revise_quote(order_id):
    from ..services.quote_revision import revise
    data, error, status = revise(request.current_user, order_id, request.get_json(silent=True) or {})
    return (jsonify({'error': error}), status) if error else (jsonify({'data': data}), status)


@mechanic_bp.post('/works/<int:work_id>/updates')
@jwt_required(roles=['mecanico'])
def publish_update(work_id):
    from ..services.repair_updates import publish
    payload = request.form.to_dict() if request.mimetype == 'multipart/form-data' else request.get_json(silent=True) or {}
    data, error, status = publish(request.current_user, work_id, payload, request.files.getlist('files'))
    return (jsonify({'error': error}), status) if error else (jsonify({'data': data}), status)


@mechanic_bp.post('/updates/<int:notification_id>/retry-email')
@jwt_required(roles=['mecanico'])
def retry_update_email(notification_id):
    from ..services.repair_updates import deliver
    data, error, status = deliver(notification_id, request.current_user)
    return (jsonify({'error': error}), status) if error else (jsonify({'data': data}), status)


# Dashboard
@mechanic_bp.get('/dashboard')
@jwt_required(roles=['mecanico'])
def mechanic_dashboard():
    data, error, status = mechanic_service.mechanic_dashboard(request.current_user)
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})


# Citas asignadas
@mechanic_bp.get('/appointments')
@jwt_required(roles=['mecanico'])
def mechanic_appointments():
    data, error, status = mechanic_service.mechanic_appointments(request.current_user)
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})


@mechanic_bp.get('/appointments/<int:cita_id>')
@jwt_required(roles=['mecanico'])
def mechanic_appointment_detail(cita_id):
    data, error, status = mechanic_service.mechanic_appointment_detail(request.current_user, cita_id)
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})


# Diagnosticos
@mechanic_bp.post('/diagnostics')
@jwt_required(roles=['mecanico'])
def register_diagnostico():
    payload = request.get_json(silent=True) or {}
    data, error, status = mechanic_service.register_diagnostico(
        request.current_user,
        payload.get('cita_id'),
        payload
    )
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})


# Trabajo/Reparacion
@mechanic_bp.post('/works')
@jwt_required(roles=['mecanico'])
def register_trabajo():
    payload = request.get_json(silent=True) or {}
    data, error, status = mechanic_service.register_trabajo(request.current_user, payload)
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})


@mechanic_bp.put('/works/<int:trabajo_id>/status')
@jwt_required(roles=['mecanico'])
def update_trabajo_status(trabajo_id):
    payload = request.get_json(silent=True) or {}
    data, error, status = mechanic_service.update_trabajo_status(request.current_user, trabajo_id, payload.get('estado'))
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})


# Foto upload
@mechanic_bp.post('/works/<int:trabajo_id>/images')
@jwt_required(roles=['mecanico'])
def upload_repair_image(trabajo_id):
    payload = request.form.to_dict()
    payload['trabajo_id'] = trabajo_id
    file = request.files.get('file') or request.files.get('image')
    data, error, status = mechanic_service.upload_repair_image(request.current_user, payload, file)
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})


# Historial de trabajos
@mechanic_bp.get('/works/history')
@jwt_required(roles=['mecanico'])
def mechanic_works_history():
    data, error, status = mechanic_service.mechanic_works_history(request.current_user)
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})


# Panel del cliente - progreso de reparacion
# Nota: este endpoint usa vehiculo_id, requiere identificacion del cliente
@mechanic_bp.get('/client/repairs/<int:vehiculo_id>/progress')
@jwt_required(roles=['usuario'])
def client_repair_progress(vehiculo_id):
    data, error, status = mechanic_service.client_repair_progress(vehiculo_id, request.current_user)
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})
@mechanic_bp.get('/orders')
@jwt_required(roles=['mecanico'])
def assigned_orders():
    from ..models import OrdenTrabajo, Trabajo
    from ..utils.orders import order_to_dict
    rows = OrdenTrabajo.query.join(OrdenTrabajo.trabajos).filter(Trabajo.mecanico_id == request.current_user.id).distinct().all()
    return jsonify({'data': [order_to_dict(row) for row in rows]})

@mechanic_bp.get('/images/<int:image_id>')
@jwt_required(roles=['mecanico', 'usuario'])
def repair_image(image_id):
    import os
    from flask import send_from_directory
    from ..models import ImagenTrabajo
    from ..extensions import db
    image = db.session.get(ImagenTrabajo, image_id)
    if not image:
        return jsonify({'error': 'Imagen no encontrada'}), 404
    if request.current_user.rol == 'mecanico' and image.trabajo.mecanico_id != request.current_user.id:
        return jsonify({'error': 'Imagen no encontrada'}), 404
    if request.current_user.rol == 'usuario' and image.trabajo.diagnostico.cita.vehiculo.usuario_id != request.current_user.id:
        return jsonify({'error': 'Imagen no encontrada'}), 404
    directory = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads', 'reparaciones'))
    response = send_from_directory(directory, os.path.basename(image.ruta_imagen))
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Cache-Control'] = 'private, no-store'
    return response
