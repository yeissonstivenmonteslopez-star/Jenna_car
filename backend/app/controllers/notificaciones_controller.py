from flask import jsonify, request
from ..services import notificaciones_s as notification_service

def mis_notificaciones():
    return jsonify(notification_service.mine(request.current_user.id, request.args.get('page', 1, type=int), min(request.args.get('per_page', 20, type=int), 50)))
def conteo_no_leidas(): return jsonify({'no_leidas': notification_service.unread_count(request.current_user.id)})
def marcar_como_leida(notificacion_id):
    item = notification_service.get_owned(request.current_user.id, notificacion_id)
    if not item: return jsonify({'error': 'Notificación no encontrada'}), 404
    return jsonify({'data': notification_service.mark_read(item)})
def marcar_todas_como_leidas():
    notification_service.mark_all_read(request.current_user.id)
    return jsonify({'message': 'Todas las notificaciones marcadas como leídas'})
def detalle_notificacion(notificacion_id):
    item = notification_service.get_owned(request.current_user.id, notificacion_id)
    if not item: return jsonify({'error': 'Notificación no encontrada'}), 404
    return jsonify({'data': item.to_dict()})
def tipos_notificacion(): return jsonify({'data': notification_service.types()})
def crear_notificacion_admin():
    data, error, status = notification_service.create(request.get_json(silent=True) or {})
    return (jsonify({'error': error}), status) if error else (jsonify({'data': data}), status)
def admin_notificaciones():
    data = notification_service.admin_list(request.args.get('q', '').strip(), request.args.get('usuario_id', '').strip(), request.args.get('tipo', '').strip(), request.args.get('no_leidas', '').strip())
    return jsonify({'data': data, 'total': len(data)})
def admin_notificacion_detalle(notificacion_id):
    item = notification_service.get(notificacion_id)
    if not item: return jsonify({'error': 'Notificación no encontrada'}), 404
    return jsonify({'data': item.to_dict()})
def admin_actualizar_notificacion(notificacion_id):
    item = notification_service.get(notificacion_id)
    if not item: return jsonify({'error': 'Notificación no encontrada'}), 404
    data, error, status = notification_service.update(item, request.get_json(silent=True) or {})
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})
