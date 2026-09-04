from datetime import datetime, timezone

from flask import Blueprint, jsonify
from sqlalchemy import text

from ..extensions import db


health_bp = Blueprint('health', __name__)


@health_bp.get('')
def health():
    try:
        db.session.execute(text('SELECT 1'))
        database = 'connected'
    except Exception:
        database = 'disconnected'

    return jsonify({
        'status': 'ok',
        'service': 'jenna-car-api',
        'database': database,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })