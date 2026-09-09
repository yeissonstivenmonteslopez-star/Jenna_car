import os
import secrets
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from ..extensions import db
from ..models import Usuario, Cliente, Cita, Notificacion, OrdenServicio, OrdenTrabajo, Pago, PasswordResetToken, Recibo, Vehiculo
from ..services.security import jwt_required

usuarios_bp = Blueprint('usuarios', __name__)
PROTECTED_USER_EMAILS = {'yeisson@gmail.com', 'admin3@jenna.com'}


@usuarios_bp.get('/admin')
@jwt_required(roles=['admin'])
def admin_usuarios():
    usuarios = Usuario.query.order_by(Usuario.created_at.desc()).all()
    return jsonify({'data': [
        {
            'id': usuario.id,
            'nombre': usuario.nombre,
            'apellido': usuario.apellido,
            'email': usuario.email,
            'telefono': usuario.telefono,
            'rol': usuario.rol,
            'estado': usuario.estado,
            'foto_perfil': usuario.foto_perfil,
            'created_at': usuario.created_at.isoformat() if usuario.created_at else None,
        }
        for usuario in usuarios
    ]})


@usuarios_bp.put('/<int:usuario_id>/rol')
@jwt_required(roles=['admin'])
def cambiar_rol_usuario(usuario_id: int):
    from ..models import Usuario as UsuarioModel
    payload = request.get_json(silent=True) or {}
    nuevo_rol = payload.get('rol')

    if nuevo_rol not in ['usuario', 'admin']:
        return jsonify({'error': 'Rol inválido. Debe ser "usuario" o "admin"'}), 400

    usuario = db.session.get(UsuarioModel, usuario_id)
    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    admin_count = db.session.query(db.func.count(UsuarioModel.id)).filter(UsuarioModel.rol == 'admin').scalar() or 0

    if usuario.rol == 'admin' and nuevo_rol != 'admin' and admin_count <= 1:
        return jsonify({'error': 'No se puede quitar el rol de administrador al último administrador existente.'}), 400

    usuario.rol = nuevo_rol
    db.session.commit()
    return jsonify({'user': usuario.to_public_dict()})


@usuarios_bp.delete('/admin/bulk')
@jwt_required(roles=['admin'])
def eliminar_usuarios():
    payload = request.get_json(silent=True) or {}
    raw_ids = payload.get('ids')
    if not isinstance(raw_ids, list) or not raw_ids:
        return jsonify({'error': 'Debes seleccionar al menos un usuario.'}), 400

    try:
        user_ids = {int(user_id) for user_id in raw_ids}
    except (TypeError, ValueError):
        return jsonify({'error': 'La selección de usuarios no es válida.'}), 400

    users = Usuario.query.filter(Usuario.id.in_(user_ids)).all()
    if len(users) != len(user_ids):
        return jsonify({'error': 'Uno o más usuarios no fueron encontrados.'}), 404
    protected = [user.email for user in users if user.email.lower() in PROTECTED_USER_EMAILS]
    if protected:
        return jsonify({'error': f'No se pueden eliminar estas cuentas protegidas: {", ".join(protected)}.'}), 400
    if request.current_user.id in user_ids:
        return jsonify({'error': 'No puedes eliminar tu propia cuenta desde este listado.'}), 400

    admin_count = Usuario.query.filter_by(rol='admin').count()
    deleting_admins = sum(user.rol == 'admin' for user in users)
    if admin_count - deleting_admins < 1:
        return jsonify({'error': 'Debe quedar al menos un administrador.'}), 400

    client_ids = [client.id for user in users for client in ([user.cliente] if user.cliente else [])]
    order_ids = []
    if client_ids:
        order_ids = [order.id for order in OrdenTrabajo.query.filter(OrdenTrabajo.cliente_id.in_(client_ids)).all()]
    receipt_ids = []
    if client_ids or order_ids:
        receipt_query = Recibo.query
        conditions = []
        if client_ids:
            conditions.append(Recibo.cliente_id.in_(client_ids))
        if order_ids:
            conditions.append(Recibo.orden_id.in_(order_ids))
        from sqlalchemy import or_
        receipt_ids = [receipt.id for receipt in receipt_query.filter(or_(*conditions)).all()]

    try:
        if user_ids:
            PasswordResetToken.query.filter(PasswordResetToken.usuario_id.in_(user_ids)).delete(synchronize_session=False)
            Notificacion.query.filter(Notificacion.usuario_id.in_(user_ids)).delete(synchronize_session=False)
            Pago.query.filter(Pago.usuario_id.in_(user_ids)).delete(synchronize_session=False)
        if receipt_ids:
            Pago.query.filter(Pago.recibo_id.in_(receipt_ids)).delete(synchronize_session=False)
            Recibo.query.filter(Recibo.id.in_(receipt_ids)).delete(synchronize_session=False)
        if order_ids:
            OrdenServicio.query.filter(OrdenServicio.orden_id.in_(order_ids)).delete(synchronize_session=False)
            OrdenTrabajo.query.filter(OrdenTrabajo.id.in_(order_ids)).delete(synchronize_session=False)
        if client_ids:
            Cita.query.filter(Cita.cliente_id.in_(client_ids)).delete(synchronize_session=False)
            Vehiculo.query.filter(Vehiculo.cliente_id.in_(client_ids)).delete(synchronize_session=False)
            Cliente.query.filter(Cliente.id.in_(client_ids)).delete(synchronize_session=False)
        Usuario.query.filter(Usuario.id.in_(user_ids)).delete(synchronize_session=False)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'No fue posible eliminar los usuarios y sus datos relacionados.'}), 409

    return jsonify({'deleted': len(users), 'protected': sorted(PROTECTED_USER_EMAILS)})


@usuarios_bp.put('/perfil')
@jwt_required()
def actualizar_perfil():
    payload = request.get_json(silent=True) or request.form.to_dict()
    usuario = request.current_user
    for field, max_length in [('nombre', 100), ('apellido', 100), ('telefono', 10)]:
        if field not in payload:
            continue
        value = (payload.get(field) or '').strip()
        if field in {'nombre', 'apellido'} and not value:
            return jsonify({'error': f'{field.capitalize()} no puede estar vacío.'}), 400
        if field == 'telefono' and not value.isdigit() or field == 'telefono' and len(value) != 10:
            return jsonify({'error': 'El teléfono debe tener exactamente 10 números.'}), 400
        setattr(usuario, field, value[:max_length] or None)
    db.session.commit()
    return jsonify({'user': usuario.to_public_dict()})


@usuarios_bp.post('/perfil/foto')
@jwt_required()
def subir_foto_perfil():
    photo = request.files.get('foto') or request.files.get('photo')
    if not photo or not photo.filename:
        return jsonify({'error': 'Selecciona una imagen para continuar.'}), 400
    extension = os.path.splitext(photo.filename)[1].lower()
    if extension not in {'.jpg', '.jpeg', '.png', '.webp'}:
        return jsonify({'error': 'La imagen debe ser JPG, PNG o WEBP.'}), 400
    upload_path = current_app.config.setdefault(
        'UPLOADS_PATH',
        os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads', 'profile-photos')),
    )
    os.makedirs(upload_path, exist_ok=True)
    filename = f'{request.current_user.id}-{secrets.token_urlsafe(12)}{extension}'
    photo.save(os.path.join(upload_path, filename))
    request.current_user.foto_perfil = f'/uploads/profile-photos/{filename}'
    db.session.commit()
    return jsonify({'user': request.current_user.to_public_dict()})


@usuarios_bp.get('/profile-photos/<path:filename>')
def foto_perfil(filename):
    upload_path = current_app.config.get('UPLOADS_PATH') or os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads', 'profile-photos'))
    return send_from_directory(upload_path, filename)
