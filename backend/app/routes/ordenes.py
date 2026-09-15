from flask import Blueprint

from ..auth.decorators import jwt_required
from ..controllers import ordenes_controller


ordenes_bp = Blueprint('ordenes', __name__)


@ordenes_bp.get('')
@jwt_required(roles=['admin'])
def admin_ordenes():
    return ordenes_controller.admin_ordenes()


@ordenes_bp.post('')
@jwt_required(roles=['admin'])
def crear_orden_admin():
    return ordenes_controller.crear_orden_admin()


@ordenes_bp.get('/<int:orden_id>')
@jwt_required(roles=['admin'])
def obtener_orden_admin(orden_id):
    return ordenes_controller.obtener_orden_admin(orden_id)


@ordenes_bp.put('/<int:orden_id>')
@jwt_required(roles=['admin'])
def actualizar_orden_admin(orden_id):
    return ordenes_controller.actualizar_orden_admin(orden_id)


@ordenes_bp.delete('/<int:orden_id>')
@jwt_required(roles=['admin'])
def eliminar_orden_admin(orden_id):
    return ordenes_controller.eliminar_orden_admin(orden_id)
