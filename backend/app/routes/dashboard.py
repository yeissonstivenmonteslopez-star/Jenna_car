from flask import Blueprint

from ..auth.decorators import jwt_required
from ..controllers import dashboard_controller

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.get('')
@jwt_required(roles=['admin'])
def admin_dashboard():
    return dashboard_controller.admin_dashboard()
