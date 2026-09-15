from flask import Blueprint
from ..auth.decorators import jwt_required
from ..controllers import recibos_controller

recibos_bp = Blueprint('recibos', __name__)

@recibos_bp.get('/mis-recibos')
@jwt_required()
def mis_recibos(): return recibos_controller.mis_recibos()

@recibos_bp.get('/<int:recibo_id>/pdf')
@jwt_required()
def recibo_pdf(recibo_id): return recibos_controller.recibo_pdf(recibo_id)
