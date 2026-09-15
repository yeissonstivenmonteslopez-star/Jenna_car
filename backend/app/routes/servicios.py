from flask import Blueprint

from ..auth.decorators import jwt_required
from ..controllers import servicios_controller


servicios_bp = Blueprint('servicios', __name__)


@servicios_bp.get('')
def listar_servicios():
    return servicios_controller.listar_servicios()


@servicios_bp.get('/<int:servicio_id>')
def obtener_servicio(servicio_id):
    return servicios_controller.obtener_servicio(servicio_id)


@servicios_bp.get('/admin')
@jwt_required(roles=['admin'])
def admin_servicios():
    return servicios_controller.admin_servicios()


@servicios_bp.get('/admin/<int:servicio_id>')
@jwt_required(roles=['admin'])
def admin_servicio_detalle(servicio_id):
    return servicios_controller.admin_servicio_detalle(servicio_id)


@servicios_bp.post('/admin')
@jwt_required(roles=['admin'])
def crear_servicio_admin():
    return servicios_controller.crear_servicio_admin()


@servicios_bp.put('/admin/<int:servicio_id>')
@jwt_required(roles=['admin'])
def actualizar_servicio_admin(servicio_id):
    return servicios_controller.actualizar_servicio_admin(servicio_id)


@servicios_bp.delete('/admin/<int:servicio_id>')
@jwt_required(roles=['admin'])
def eliminar_servicio_admin(servicio_id):
    return servicios_controller.eliminar_servicio_admin(servicio_id)
