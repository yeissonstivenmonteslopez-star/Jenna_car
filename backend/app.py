"""Legacy WSGI compatibility entrypoint.

Use ``run.py`` for local execution. The application itself lives in ``app``.
"""

from app import app, create_app


if __name__ == '__main__':
    create_app().run(
        debug=app.config.get('DEBUG', True),
        host='0.0.0.0',
        port=5000,
    )