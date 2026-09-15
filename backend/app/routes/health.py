from flask import Blueprint

from ..controllers import health_controller

health_bp = Blueprint('health', __name__)


@health_bp.get('')
def health():
    return health_controller.health()
