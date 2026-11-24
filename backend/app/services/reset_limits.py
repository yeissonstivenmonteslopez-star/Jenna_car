"""Bound recovery requests across workers sharing the application data volume."""
from contextlib import closing
import hashlib
from pathlib import Path
import sqlite3
import time
from flask import current_app


def allow_reset_request(email, origin):
    path = Path(current_app.config['UPLOADS_PATH']).parent / '.reset-limits.sqlite3'
    now = int(time.time())
    origin_key = hashlib.sha256(('ip:' + origin).encode()).hexdigest()
    email_key = hashlib.sha256(('email:' + email).encode()).hexdigest()
    with closing(sqlite3.connect(path)) as connection, connection:
        connection.execute('BEGIN IMMEDIATE')
        connection.execute('CREATE TABLE IF NOT EXISTS requests (bucket TEXT, issued INTEGER)')
        connection.execute('CREATE INDEX IF NOT EXISTS by_bucket ON requests(bucket, issued)')
        connection.execute('DELETE FROM requests WHERE issued <= ?', (now - 3600,))
        for key, maximum in ((origin_key, 30), (email_key, 5)):
            count, latest = connection.execute(
                'SELECT COUNT(*), MAX(issued) FROM requests WHERE bucket = ?', (key,)
            ).fetchone()
            if count >= maximum or (key == email_key and latest is not None and now - latest < 60):
                return False
        connection.executemany('INSERT INTO requests VALUES (?, ?)', [(origin_key, now), (email_key, now)])
    return True
