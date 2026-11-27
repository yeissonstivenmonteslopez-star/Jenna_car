"""Bound recovery requests across workers sharing the application data volume."""
from contextlib import closing
import hashlib
from pathlib import Path
import sqlite3
import time
from flask import current_app


def _database_path():
    return Path(current_app.config['UPLOADS_PATH']).parent / '.security-limits.sqlite3'


def _bucket(prefix, value):
    return hashlib.sha256(f'{prefix}:{value}'.encode()).hexdigest()


def allow_reset_request(email, origin):
    path = _database_path()
    now = int(time.time())
    origin_key = hashlib.sha256(('ip:' + origin).encode()).hexdigest()
    email_key = hashlib.sha256(('email:' + email).encode()).hexdigest()
    with closing(sqlite3.connect(path)) as connection, connection:
        connection.execute('BEGIN IMMEDIATE')
        connection.execute('CREATE TABLE IF NOT EXISTS requests (bucket TEXT, issued INTEGER)')
        connection.execute('CREATE INDEX IF NOT EXISTS by_bucket ON requests(bucket, issued)')
        connection.execute('DELETE FROM requests WHERE issued <= ?', (now - 3600,))
        # At most three recovery emails per address each hour, with four minutes between them.
        for key, maximum in ((origin_key, 30), (email_key, 3)):
            count, latest = connection.execute(
                'SELECT COUNT(*), MAX(issued) FROM requests WHERE bucket = ?', (key,)
            ).fetchone()
            if count >= maximum or (key == email_key and latest is not None and now - latest < 240):
                return False
        connection.executemany('INSERT INTO requests VALUES (?, ?)', [(origin_key, now), (email_key, now)])
    return True


def allow_login_attempt(email, origin):
    """Return False after repeated failed logins in the last 15 minutes."""
    now = int(time.time())
    keys = ((_bucket('login-email', email), 8), (_bucket('login-origin', origin), 30))
    with closing(sqlite3.connect(_database_path())) as connection, connection:
        connection.execute('BEGIN IMMEDIATE')
        connection.execute('CREATE TABLE IF NOT EXISTS login_failures (bucket TEXT, issued INTEGER)')
        connection.execute('CREATE INDEX IF NOT EXISTS login_by_bucket ON login_failures(bucket, issued)')
        connection.execute('DELETE FROM login_failures WHERE issued <= ?', (now - 900,))
        return all(connection.execute(
            'SELECT COUNT(*) FROM login_failures WHERE bucket = ?', (key,)
        ).fetchone()[0] < maximum for key, maximum in keys)


def record_login_failure(email, origin):
    now = int(time.time())
    rows = [(_bucket('login-email', email), now), (_bucket('login-origin', origin), now)]
    with closing(sqlite3.connect(_database_path())) as connection, connection:
        connection.execute('CREATE TABLE IF NOT EXISTS login_failures (bucket TEXT, issued INTEGER)')
        connection.executemany('INSERT INTO login_failures VALUES (?, ?)', rows)


def clear_login_failures(email):
    key = _bucket('login-email', email)
    with closing(sqlite3.connect(_database_path())) as connection, connection:
        connection.execute('CREATE TABLE IF NOT EXISTS login_failures (bucket TEXT, issued INTEGER)')
        connection.execute('DELETE FROM login_failures WHERE bucket = ?', (key,))
