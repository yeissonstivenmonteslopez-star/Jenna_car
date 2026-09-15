from flask import Blueprint

from ..auth.decorators import jwt_required
from ..controllers import citas_controller


citas_bp = Blueprint('citas', __name__)


@citas_bp.post('')
@jwt_required()
def create_appointment():
    return citas_controller.create_appointment()


@citas_bp.post('/disponibilidad')
@jwt_required()
def verificar_disponibilidad():
    return citas_controller.verificar_disponibilidad()


@citas_bp.get('/mis-citas')
@jwt_required()
def mis_citas():
    return citas_controller.mis_citas()


@citas_bp.get('/<int:cita_id>')
@jwt_required()
def detalle_cita(cita_id):
    return citas_controller.detalle_cita(cita_id)


@citas_bp.post('/<int:cita_id>/cancelar')
@jwt_required()
def cancelar_cita(cita_id):
    return citas_controller.cancelar_cita(cita_id)


@citas_bp.get('/admin')
@jwt_required(roles=['admin'])
def admin_citas():
    return citas_controller.admin_citas()


@citas_bp.route('/admin/<int:cita_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required(roles=['admin'])
def admin_cita_detalle(cita_id):
    return citas_controller.admin_cita_detalle(cita_id)


@citas_bp.post('/admin')
@jwt_required(roles=['admin'])
def crear_cita_admin():
    return citas_controller.crear_cita_admin()


@citas_bp.put('/admin/<int:cita_id>/estado')
@jwt_required(roles=['admin'])
def actualizar_estado_cita(cita_id):
    return citas_controller.actualizar_estado_cita(cita_id)
