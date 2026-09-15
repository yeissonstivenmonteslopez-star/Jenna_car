from flask import Blueprint

from ..auth.decorators import jwt_required
from ..controllers import vehiculos_controller

vehiculos_bp = Blueprint('vehiculos', __name__)


@vehiculos_bp.get('')
@jwt_required()
def mis_vehiculos(): return vehiculos_controller.mis_vehiculos()


@vehiculos_bp.post('')
@jwt_required()
def crear_vehiculo_cliente(): return vehiculos_controller.crear_vehiculo_cliente()


@vehiculos_bp.get('/admin')
@jwt_required(roles=['admin'])
def admin_vehiculos(): return vehiculos_controller.admin_vehiculos()


@vehiculos_bp.get('/admin/<int:vehiculo_id>')
@jwt_required(roles=['admin'])
def admin_vehiculo_detalle(vehiculo_id): return vehiculos_controller.admin_vehiculo_detalle(vehiculo_id)


@vehiculos_bp.post('/admin')
@jwt_required(roles=['admin'])
def crear_vehiculo_admin(): return vehiculos_controller.crear_vehiculo_admin()


@vehiculos_bp.put('/admin/<int:vehiculo_id>')
@jwt_required(roles=['admin'])
def actualizar_vehiculo_admin(vehiculo_id): return vehiculos_controller.actualizar_vehiculo_admin(vehiculo_id)


@vehiculos_bp.delete('/admin/<int:vehiculo_id>')
@jwt_required(roles=['admin'])
def eliminar_vehiculo_admin(vehiculo_id): return vehiculos_controller.eliminar_vehiculo_admin(vehiculo_id)
