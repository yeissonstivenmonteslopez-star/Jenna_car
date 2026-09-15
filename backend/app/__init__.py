"""Application package and public compatibility exports."""

# Los siguientes imports se mantienen a nivel de módulo aunque parezcan no usarse
# directamente en este archivo: los tests hacen ``import app as backend_app`` y
# acceden a ``backend_app.datetime``, ``backend_app.timezone``, ``backend_app.secrets``,
# ``backend_app.google_id_token``, ``backend_app.generate_password_hash`` y
# ``backend_app.create_access_token``. Eliminarlos rompería la compatibilidad con tests.
from datetime import datetime, timezone  # noqa: F401 - compatibilidad con tests (backend_app.datetime / backend_app.timezone)
import os
import secrets  # noqa: F401 - compatibilidad con tests (backend_app.secrets)

from flask import Flask
from flask_cors import CORS
from sqlalchemy import text
from .auth.password import hash_password as generate_password_hash  # noqa: F401 - compatibilidad con tests
from google.oauth2 import id_token as google_id_token  # noqa: F401 - compatibilidad con tests

from .extensions import db
from .extensions import migrate
from .models import Cita, Cliente, Notificacion, OrdenServicio, OrdenTrabajo, Pago, PasswordResetToken, Recibo, Servicio, Usuario, Vehiculo
from .api import ADMIN_ROUTES, BLUEPRINT_REGISTRATIONS
from .config import apply_config
from .services.catalog import seed_services
from .auth.jwt import create_access_token  # noqa: F401 - compatibilidad con tests

from .routes.usuarios import foto_perfil


def _initialize_database(app):
    if os.getenv('SKIP_DB_INIT') == '1':
        return
    with app.app_context():
        db.create_all()
        try:
            inspector = db.inspect(db.engine)
            if inspector.has_table('usuarios'):
                columns = {column['name'] for column in inspector.get_columns('usuarios')}
                if 'foto_perfil' not in columns:
                    db.session.execute(text('ALTER TABLE usuarios ADD COLUMN foto_perfil VARCHAR(500)'))
                    db.session.commit()
                if 'google_id' not in columns:
                    db.session.execute(text('ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255)'))
                    db.session.commit()
            if inspector.has_table('pagos'):
                columns = {column['name'] for column in inspector.get_columns('pagos')}
                for column, definition in [('usuario_id', 'INT UNSIGNED NULL'), ('numero_nequi', 'VARCHAR(20) NULL'), ('creado_en', 'DATETIME NULL')]:
                    if column not in columns:
                        try:
                            db.session.execute(text(f'ALTER TABLE pagos ADD COLUMN {column} {definition}'))
                            db.session.commit()
                        except Exception:
                            db.session.rollback()
        except Exception:
            db.session.rollback()
        if seed_services(Servicio, db.session):
            db.session.commit()


def create_app(config=None):
    """Application factory — crea y configura la app Flask.

    Toda la inicialización (config, CORS, extensiones, BD, blueprints y
    rutas oficiales) ocurre aquí, de modo que ``import app`` no tenga efectos
    secundarios. El objeto global ``app = create_app()`` al final del módulo
    se mantiene solo por compatibilidad (run.py, app.py y tests acceden a
    ``backend_app.app`` / ``backend_app.db`` directamente).
    """
    app = Flask(__name__)
    apply_config(app)
    os.makedirs(app.config['UPLOADS_PATH'], exist_ok=True)

    if config:
        app.config.update(config)

    CORS(app, resources={r'/api/*': {'origins': os.getenv('FRONTEND_ORIGIN', '*')}})
    db.init_app(app)
    migrate.init_app(app, db)

    _initialize_database(app)

    # Registro de blueprints oficiales (únicos prefijos reales, sin versionado)
    # 2026-09-08: prefijo API v2 eliminado por no tener consumidores.
    for blueprint, url_prefix in BLUEPRINT_REGISTRATIONS:
        app.register_blueprint(blueprint, url_prefix=url_prefix)

    # Ruta única para servir fotos de perfil (no depende de blueprint versionado)
    app.add_url_rule('/uploads/profile-photos/<path:filename>', endpoint='compat_profile_photo', view_func=foto_perfil)

    # Rutas oficiales de administración /api/admin/... (un solo loop, methods=None => GET por defecto)
    for rule, view_func, endpoint, methods in ADMIN_ROUTES:
        app.add_url_rule(rule, endpoint=endpoint, view_func=view_func, methods=methods)

    return app


# Instancia global por compatibilidad: run.py, app.py y tests hacen
# ``import app as backend_app`` y usan ``backend_app.app``.
app = create_app()

__all__ = ['app', 'db', 'create_app']
