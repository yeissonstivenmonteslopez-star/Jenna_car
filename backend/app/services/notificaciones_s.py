"""Notification queries and mutations."""
from ..extensions import db
from ..models import Notificacion, Usuario


def mine(user_id, page, per_page):
    pagination = Notificacion.query.filter_by(usuario_id=user_id).order_by(Notificacion.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return {'data': [item.to_dict() for item in pagination.items], 'no_leidas': Notificacion.query.filter_by(usuario_id=user_id, leida=False).count(), 'total': pagination.total, 'page': page, 'per_page': per_page, 'total_pages': pagination.pages}

def unread_count(user_id): return Notificacion.query.filter_by(usuario_id=user_id, leida=False).count()
def get_owned(user_id, notification_id): return Notificacion.query.filter_by(id=notification_id, usuario_id=user_id).first()
def mark_read(notification): notification.leida = True; db.session.commit(); return notification.to_dict()
def mark_all_read(user_id): Notificacion.query.filter_by(usuario_id=user_id, leida=False).update({'leida': True}); db.session.commit()
def types(): return [{'value': value, 'label': Notificacion.TIPO_LABELS[value]} for value in Notificacion.TIPOS]
def create(payload):
    title = (payload.get('titulo') or '').strip(); message = (payload.get('mensaje') or '').strip(); user_id = payload.get('usuario_id')
    if not title: return None, 'El título es obligatorio', 400
    if not message: return None, 'El mensaje es obligatorio', 400
    if not user_id: return None, 'El usuario destino es obligatorio', 400
    if not db.session.get(Usuario, user_id): return None, 'Usuario no encontrado', 404
    return Notificacion.crear(user_id, title, message, (payload.get('tipo') or '').strip() or 'sistema', payload.get('link')).to_dict(), None, 201
def admin_list(query, user_id, tipo, unread):
    base = Notificacion.query.join(Usuario)
    if query: base = base.filter((Notificacion.titulo.ilike(f'%{query}%')) | (Notificacion.mensaje.ilike(f'%{query}%')) | (Usuario.nombre.ilike(f'%{query}%')) | (Usuario.apellido.ilike(f'%{query}%')) | (Usuario.email.ilike(f'%{query}%')))
    if user_id: base = base.filter(Notificacion.usuario_id == int(user_id))
    if tipo and tipo in Notificacion.TIPOS: base = base.filter(Notificacion.tipo == tipo)
    if unread == 'true': base = base.filter(Notificacion.leida.is_(False))
    items = base.order_by(Notificacion.created_at.desc()).all()
    return [item.to_dict() for item in items]
def get(notification_id): return db.session.get(Notificacion, notification_id)
def update(notification, payload):
    if 'titulo' in payload:
        title = (payload.get('titulo') or '').strip()
        if not title: return None, 'El título no puede estar vacío', 400
        notification.titulo = title
    if 'mensaje' in payload:
        message = (payload.get('mensaje') or '').strip()
        if not message: return None, 'El mensaje no puede estar vacío', 400
        notification.mensaje = message
    if 'leida' in payload: notification.leida = bool(payload['leida'])
    if 'tipo' in payload and payload.get('tipo') in Notificacion.TIPOS: notification.tipo = payload['tipo']
    if 'link' in payload: notification.link = (payload.get('link') or '').strip() or None
    db.session.commit(); return notification.to_dict(), None, None
