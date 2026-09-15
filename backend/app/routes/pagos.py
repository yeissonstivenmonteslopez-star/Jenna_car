from flask import Blueprint

from ..auth.decorators import jwt_required
from ..controllers import pagos_controller


pagos_bp = Blueprint('pagos', __name__)


@pagos_bp.get('/admin')
@jwt_required(roles=['admin'])
def admin_pagos():
    return pagos_controller.admin_pagos()


@pagos_bp.get('/admin/<int:pago_id>')
@jwt_required(roles=['admin'])
def admin_pago_detalle(pago_id):
    return pagos_controller.admin_pago_detalle(pago_id)


@pagos_bp.post('')
@jwt_required()
def crear_pago_simulado():
    return pagos_controller.crear_pago_simulado()


@pagos_bp.get('/<int:pago_id>')
@jwt_required()
def detalle_pago_usuario(pago_id):
    return pagos_controller.detalle_pago_usuario(pago_id)


@pagos_bp.get('/mis-pagos')
@jwt_required()
def mis_pagos():
    return pagos_controller.mis_pagos()
