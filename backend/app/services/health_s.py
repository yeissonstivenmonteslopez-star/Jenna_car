from sqlalchemy import text

from ..extensions import db


def database_status():
    try:
        db.session.execute(text('SELECT 1'))
        return 'connected'
    except Exception:
        return 'disconnected'