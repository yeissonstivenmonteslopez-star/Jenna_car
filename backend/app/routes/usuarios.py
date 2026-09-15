from flask import Blueprint

from ..auth.decorators import jwt_required
from ..controllers import usuarios_controller

usuarios_bp = Blueprint('usuarios', __name__)


@usuarios_bp.get('/admin')
@jwt_required(roles=['admin'])
def admin_usuarios(): return usuarios_controller.admin_usuarios()


@usuarios_bp.put('/<int:usuario_id>/rol')
@jwt_required(roles=['admin'])
def cambiar_rol_usuario(usuario_id): return usuarios_controller.cambiar_rol_usuario(usuario_id)


@usuarios_bp.delete('/admin/bulk')
@jwt_required(roles=['admin'])
def eliminar_usuarios(): return usuarios_controller.eliminar_usuarios()


@usuarios_bp.put('/perfil')
@jwt_required()
def actualizar_perfil(): return usuarios_controller.actualizar_perfil()


@usuarios_bp.post('/perfil/foto')
@jwt_required()
def subir_foto_perfil(): return usuarios_controller.subir_foto_perfil()


@usuarios_bp.get('/profile-photos/<path:filename>')
def foto_perfil(filename): return usuarios_controller.foto_perfil(filename)
