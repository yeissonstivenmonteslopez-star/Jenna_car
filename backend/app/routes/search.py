from flask import Blueprint

from ..auth.decorators import jwt_required
from ..controllers import search_controller

search_bp = Blueprint('search', __name__)


@search_bp.get('')
@jwt_required(roles=['admin'])
def admin_search():
    return search_controller.admin_search()
