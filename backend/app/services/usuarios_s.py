"""User administration and profile operations."""
import os, secrets
from ..models import Usuario
from ..repository import usuarios_r as user_repository
from ..repository.clientes_r import find_by_user
PROTECTED_USER_EMAILS = {'yeisson@gmail.com', 'admin3@jenna.com'}

def list_admin():
    return [{'id': u.id, 'nombre': u.nombre, 'apellido': u.apellido, 'email': u.email, 'telefono': u.telefono, 'rol': u.rol, 'estado': u.estado, 'foto_perfil': u.foto_perfil, 'created_at': u.created_at.isoformat() if u.created_at else None} for u in user_repository.list_all()]
def change_role(user_id, role):
    if role not in ['usuario', 'admin']: return None, 'Rol inválido. Debe ser "usuario" o "admin"', 400
    user = user_repository.get(user_id)
    if not user: return None, 'Usuario no encontrado', 404
    admins = user_repository.count_admins()
    if user.rol == 'admin' and role != 'admin' and admins <= 1: return None, 'No se puede quitar el rol de administrador al último administrador existente.', 400
    user.rol = role; user_repository.commit(); return {'user': user.to_public_dict()}, None, None
def delete_bulk(ids, current_id):
    if not isinstance(ids, list) or not ids: return None, 'Debes seleccionar al menos un usuario.', 400
    try: user_ids = {int(value) for value in ids}
    except (TypeError, ValueError): return None, 'La selección de usuarios no es válida.', 400
    users = [user_repository.get(user_id) for user_id in user_ids]
    users = [user for user in users if user]
    if len(users) != len(user_ids): return None, 'Uno o más usuarios no fueron encontrados.', 404
    protected = [u.email for u in users if u.email.lower() in PROTECTED_USER_EMAILS]
    if protected: return None, f'No se pueden eliminar estas cuentas protegidas: {", ".join(protected)}.', 400
    if current_id in user_ids: return None, 'No puedes eliminar tu propia cuenta desde este listado.', 400
    admin_count = user_repository.count_admins(); deleting = sum(u.rol == 'admin' for u in users)
    if admin_count - deleting < 1: return None, 'Debe quedar al menos un administrador.', 400
    client_ids = [client.id for user in users if (client := find_by_user(user.id))]
    order_ids, receipt_ids = user_repository.related_ids(client_ids)
    try:
        user_repository.delete_cascade(user_ids, client_ids, order_ids, receipt_ids); user_repository.commit()
    except Exception: user_repository.rollback(); return None, 'No fue posible eliminar los usuarios y sus datos relacionados.', 409
    return {'deleted': len(users), 'protected': sorted(PROTECTED_USER_EMAILS)}, None, None
def update_profile(user, payload):
    for field, max_length in [('nombre', 100), ('apellido', 100), ('telefono', 10)]:
        if field not in payload: continue
        value = (payload.get(field) or '').strip()
        if field in {'nombre', 'apellido'} and not value: return None, f'{field.capitalize()} no puede estar vacío.', 400
        if field == 'telefono' and (not value.isdigit() or len(value) != 10): return None, 'El teléfono debe tener exactamente 10 números.', 400
        setattr(user, field, value[:max_length] or None)
    user_repository.commit(); return {'user': user.to_public_dict()}, None, None
def save_photo(user, photo, upload_path):
    if not photo or not photo.filename: return None, 'Selecciona una imagen para continuar.', 400
    extension = os.path.splitext(photo.filename)[1].lower()
    if extension not in {'.jpg', '.jpeg', '.png', '.webp'}: return None, 'La imagen debe ser JPG, PNG o WEBP.', 400
    os.makedirs(upload_path, exist_ok=True); filename = f'{user.id}-{secrets.token_urlsafe(12)}{extension}'; photo.save(os.path.join(upload_path, filename)); user.foto_perfil = f'/uploads/profile-photos/{filename}'; user_repository.commit(); return {'user': user.to_public_dict()}, None, None
