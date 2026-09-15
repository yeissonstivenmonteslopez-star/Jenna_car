from flask import Blueprint

from ..auth.decorators import jwt_required
from ..controllers import clientes_controller

clientes_bp = Blueprint('clientes', __name__)


@clientes_bp.get('')
@jwt_required(roles=['admin'])
def listar_clientes():
    return clientes_controller.listar_clientes()


@clientes_bp.get('/<int:cliente_id>')
@jwt_required(roles=['admin'])
def obtener_cliente(cliente_id):
    return clientes_controller.obtener_cliente(cliente_id)
