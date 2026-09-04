from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Notificacion, Usuario
from ..services.security import jwt_required

notificaciones_bp = Blueprint('notificaciones', __name__)


@notificaciones_bp.get('')
@jwt_required()
def mis_notificaciones():
    usuario = request.current_user
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 50)
    query = Notificacion.query.filter_by(usuario_id=usuario.id).order_by(Notificacion.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'data': [notification.to_dict() for notification in pagination.items],
        'no_leidas': Notificacion.query.filter_by(usuario_id=usuario.id, leida=False).count(),
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'total_pages': pagination.pages,
    })


@notificaciones_bp.get('/no-leidas/count')
@jwt_required()
def conteo_no_leidas():
    count = Notificacion.query.filter_by(usuario_id=request.current_user.id, leida=False).count()
    return jsonify({'no_leidas': count})


@notificaciones_bp.patch('/<int:notificacion_id>/leer')
@jwt_required()
def marcar_como_leida(notificacion_id):
    notification = Notificacion.query.filter_by(
        id=notificacion_id,
        usuario_id=request.current_user.id,
    ).first()
    if not notification:
        return jsonify({'error': 'Notificación no encontrada'}), 404
    notification.leida = True
    db.session.commit()
    return jsonify({'data': notification.to_dict()})


@notificaciones_bp.patch('/marcar-todas-leidas')
@jwt_required()
def marcar_todas_como_leidas():
    Notificacion.query.filter_by(usuario_id=request.current_user.id, leida=False).update({'leida': True})
    db.session.commit()
    return jsonify({'message': 'Todas las notificaciones marcadas como leídas'})


@notificaciones_bp.get('/<int:notificacion_id>')
@jwt_required()
def detalle_notificacion(notificacion_id):
    notification = Notificacion.query.filter_by(
        id=notificacion_id,
        usuario_id=request.current_user.id,
    ).first()
    if not notification:
        return jsonify({'error': 'Notificación no encontrada'}), 404
    return jsonify({'data': notification.to_dict()})


@notificaciones_bp.get('/tipos')
@jwt_required()
def tipos_notificacion():
    return jsonify({'data': [
        {'value': notification_type, 'label': Notificacion.TIPO_LABELS[notification_type]}
        for notification_type in Notificacion.TIPOS
    ]})


@notificaciones_bp.post('/admin')
@jwt_required(roles=['admin'])
def crear_notificacion_admin():
    payload = request.get_json(silent=True) or {}
    titulo = (payload.get('titulo') or '').strip()
    mensaje = (payload.get('mensaje') or '').strip()
    usuario_id = payload.get('usuario_id')
    if not titulo:
        return jsonify({'error': 'El título es obligatorio'}), 400
    if not mensaje:
        return jsonify({'error': 'El mensaje es obligatorio'}), 400
    if not usuario_id:
        return jsonify({'error': 'El usuario destino es obligatorio'}), 400
    if not db.session.get(Usuario, usuario_id):
        return jsonify({'error': 'Usuario no encontrado'}), 404
    notification = Notificacion.crear(
        usuario_id=usuario_id,
        titulo=titulo,
        mensaje=mensaje,
        tipo=(payload.get('tipo') or '').strip() or 'sistema',
        link=payload.get('link'),
    )
    return jsonify({'data': notification.to_dict()}), 201


@notificaciones_bp.get('/admin')
@jwt_required(roles=['admin'])
def admin_notificaciones():
    query = request.args.get('q', '').strip()
    usuario_id = request.args.get('usuario_id', '').strip()
    tipo = request.args.get('tipo', '').strip()
    solo_no_leidas = request.args.get('no_leidas', '').strip()
    base_query = Notificacion.query.join(Usuario)
    if query:
        base_query = base_query.filter(
            (Notificacion.titulo.ilike(f'%{query}%'))
            | (Notificacion.mensaje.ilike(f'%{query}%'))
            | (Usuario.nombre.ilike(f'%{query}%'))
            | (Usuario.apellido.ilike(f'%{query}%'))
            | (Usuario.email.ilike(f'%{query}%'))
        )
    if usuario_id:
        base_query = base_query.filter(Notificacion.usuario_id == int(usuario_id))
    if tipo and tipo in Notificacion.TIPOS:
        base_query = base_query.filter(Notificacion.tipo == tipo)
    if solo_no_leidas == 'true':
        base_query = base_query.filter(Notificacion.leida.is_(False))
    notifications = base_query.order_by(Notificacion.created_at.desc()).all()
    return jsonify({'data': [notification.to_dict() for notification in notifications], 'total': len(notifications)})


@notificaciones_bp.get('/admin/<int:notificacion_id>')
@jwt_required(roles=['admin'])
def admin_notificacion_detalle(notificacion_id):
    notification = db.session.get(Notificacion, notificacion_id)
    if not notification:
        return jsonify({'error': 'Notificación no encontrada'}), 404
    return jsonify({'data': notification.to_dict()})


@notificaciones_bp.patch('/admin/<int:notificacion_id>')
@jwt_required(roles=['admin'])
def admin_actualizar_notificacion(notificacion_id):
    notification = db.session.get(Notificacion, notificacion_id)
    if not notification:
        return jsonify({'error': 'Notificación no encontrada'}), 404
    payload = request.get_json(silent=True) or {}
    if 'titulo' in payload:
        titulo = (payload.get('titulo') or '').strip()
        if not titulo:
            return jsonify({'error': 'El título no puede estar vacío'}), 400
        notification.titulo = titulo
    if 'mensaje' in payload:
        mensaje = (payload.get('mensaje') or '').strip()
        if not mensaje:
            return jsonify({'error': 'El mensaje no puede estar vacío'}), 400
        notification.mensaje = mensaje
    if 'leida' in payload:
        notification.leida = bool(payload['leida'])
    if 'tipo' in payload and payload.get('tipo') in Notificacion.TIPOS:
        notification.tipo = payload['tipo']
    if 'link' in payload:
        notification.link = (payload.get('link') or '').strip() or None
    db.session.commit()
    return jsonify({'data': notification.to_dict()})
