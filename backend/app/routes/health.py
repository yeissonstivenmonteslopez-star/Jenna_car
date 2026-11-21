from flask import Blueprint

from ..controllers import health_controller

health_bp = Blueprint('health', __name__)


@health_bp.get('')
def health():
    return health_controller.health()


@health_bp.get('/ready')
def ready():
    from sqlalchemy import text
    from sqlalchemy.exc import SQLAlchemyError
    from ..extensions import db
    try:
        db.session.execute(text('SELECT 1'))
    except SQLAlchemyError:
        return {'status': 'unavailable'}, 503
    return {'status': 'ok'}, 200
