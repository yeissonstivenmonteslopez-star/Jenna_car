from datetime import datetime, timezone

from flask import jsonify


def health():
    return jsonify({
        'status': 'ok',
        'service': 'jenna-car-api',
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })