from datetime import datetime, timezone

from flask import jsonify

from ..services.health_s import database_status


def health():
    return jsonify({'status': 'ok', 'service': 'jenna-car-api', 'database': database_status(), 'timestamp': datetime.now(timezone.utc).isoformat()})
