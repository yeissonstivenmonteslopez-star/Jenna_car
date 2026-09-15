import os
from flask import current_app, jsonify, request, send_from_directory
from ..services import usuarios_s as user_service

def admin_usuarios(): return jsonify({'data': user_service.list_admin()})
def cambiar_rol_usuario(usuario_id):
    data, error, status = user_service.change_role(usuario_id, (request.get_json(silent=True) or {}).get('rol'))
    return (jsonify({'error': error}), status) if error else jsonify(data)
def eliminar_usuarios():
    data, error, status = user_service.delete_bulk((request.get_json(silent=True) or {}).get('ids'), request.current_user.id)
    return (jsonify({'error': error}), status) if error else jsonify(data)
def actualizar_perfil():
    data, error, status = user_service.update_profile(request.current_user, request.get_json(silent=True) or request.form.to_dict())
    return (jsonify({'error': error}), status) if error else jsonify(data)
def subir_foto_perfil():
    photo = request.files.get('foto') or request.files.get('photo')
    path = current_app.config.setdefault('UPLOADS_PATH', os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads', 'profile-photos')))
    data, error, status = user_service.save_photo(request.current_user, photo, path)
    return (jsonify({'error': error}), status) if error else jsonify(data)
def foto_perfil(filename):
    path = current_app.config.get('UPLOADS_PATH') or os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads', 'profile-photos'))
    return send_from_directory(path, filename)
