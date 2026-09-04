"""Application package and public compatibility exports."""

from datetime import datetime, timezone
import os
import secrets

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from sqlalchemy import text
from werkzeug.security import generate_password_hash
from google.oauth2 import id_token as google_id_token

from .extensions import db
from .extensions import migrate
from .models import Cita, Cliente, Notificacion, OrdenServicio, OrdenTrabajo, Pago, PasswordResetToken, Recibo, Servicio, Usuario, Vehiculo
from .services.catalog import seed_services
from .services.security import create_access_token

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024
app.config['UPLOADS_PATH'] = os.path.join(os.path.dirname(__file__), 'uploads', 'profile-photos')
os.makedirs(app.config['UPLOADS_PATH'], exist_ok=True)

database_url = os.getenv('DATABASE_URL') or os.getenv('MYSQL_URL')
if not database_url:
    database_url = f"mysql+pymysql://{os.getenv('DB_USER', 'root')}:{os.getenv('DB_PASSWORD', '')}@{os.getenv('DB_HOST', '127.0.0.1')}:{os.getenv('DB_PORT', '3306')}/{os.getenv('DB_NAME', 'jenna_car')}?charset=utf8mb4"
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CORS(app, resources={r'/api/*': {'origins': os.getenv('FRONTEND_ORIGIN', '*')}})
db.init_app(app)
migrate.init_app(app, db)


def _initialize_database():
    if os.getenv('SKIP_DB_INIT') == '1':
        return
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


with app.app_context():
    _initialize_database()


from .routes.servicios_bp import servicios_bp
from .routes.vehiculos_bp import vehiculos_bp
from .routes.citas_bp import citas_bp
from .routes.auth_bp import auth_bp
from .routes.notificaciones_bp import notificaciones_bp
from .routes.pagos_bp import pagos_bp
from .routes.recibos_bp import recibos_bp
from .routes.dashboard_bp import dashboard_bp
from .routes.clientes_bp import clientes_bp
from .routes.usuarios_bp import usuarios_bp, admin_usuarios, cambiar_rol_usuario, eliminar_usuarios
from .routes.ordenes_bp import ordenes_bp
from .routes.search_bp import search_bp
from .routes.servicios_bp import admin_servicios, admin_servicio_detalle, crear_servicio_admin, actualizar_servicio_admin, eliminar_servicio_admin
from .routes.vehiculos_bp import admin_vehiculos, admin_vehiculo_detalle, crear_vehiculo_admin, actualizar_vehiculo_admin, eliminar_vehiculo_admin
from .routes.notificaciones_bp import crear_notificacion_admin, admin_notificaciones, admin_notificacion_detalle, admin_actualizar_notificacion
from .routes.dashboard_bp import admin_dashboard
from .routes.search_bp import admin_search
from .routes.ordenes_bp import admin_ordenes, crear_orden_admin, obtener_orden_admin, actualizar_orden_admin, eliminar_orden_admin
from .routes.citas_bp import admin_citas, admin_cita_detalle, crear_cita_admin, actualizar_estado_cita
from .routes.pagos_bp import admin_pagos, admin_pago_detalle
from .routes.usuarios_bp import foto_perfil
from .routes.health_bp import health_bp

app.register_blueprint(servicios_bp, url_prefix='/api/v2/services')
app.register_blueprint(servicios_bp, url_prefix='/api/services', name='servicios_compat')
app.register_blueprint(vehiculos_bp, url_prefix='/api/v2/vehicles')
app.register_blueprint(vehiculos_bp, url_prefix='/api/vehiculos', name='vehiculos_compat')
app.register_blueprint(citas_bp, url_prefix='/api/v2/appointments')
app.register_blueprint(citas_bp, url_prefix='/api/citas', name='citas_compat')
app.register_blueprint(auth_bp, url_prefix='/api/v2/auth')
app.register_blueprint(auth_bp, url_prefix='/api/auth', name='auth_compat')
app.register_blueprint(notificaciones_bp, url_prefix='/api/v2/notifications')
app.register_blueprint(notificaciones_bp, url_prefix='/api/notificaciones', name='notificaciones_compat')
app.register_blueprint(pagos_bp, url_prefix='/api/v2/payments')
app.register_blueprint(pagos_bp, url_prefix='/api/pagos', name='pagos_compat')
app.register_blueprint(recibos_bp, url_prefix='/api/v2/receipts')
app.register_blueprint(recibos_bp, url_prefix='/api/recibos', name='recibos_compat')
app.register_blueprint(dashboard_bp, url_prefix='/api/v2/admin/dashboard')
app.register_blueprint(clientes_bp, url_prefix='/api/v2/admin/clients')
app.register_blueprint(usuarios_bp, url_prefix='/api/v2/admin/users')
app.register_blueprint(usuarios_bp, url_prefix='/api/v2/users', name='usuarios_public')
app.register_blueprint(usuarios_bp, url_prefix='/api/usuarios', name='usuarios_compat')
app.register_blueprint(ordenes_bp, url_prefix='/api/v2/admin/orders')
app.register_blueprint(search_bp, url_prefix='/api/v2/admin/search')
app.register_blueprint(health_bp, url_prefix='/api/health')
app.add_url_rule('/uploads/profile-photos/<path:filename>', endpoint='compat_profile_photo', view_func=foto_perfil)


def _register_compatibility_route(rule, view_func, endpoint, methods=None):
    app.add_url_rule(rule, endpoint=f'compat_{endpoint}', view_func=view_func, methods=methods)


for _rule, _view, _endpoint in [
    ('/api/admin/servicios', admin_servicios, 'admin_servicios'),
    ('/api/admin/servicios/<int:servicio_id>', admin_servicio_detalle, 'admin_servicio_detalle'),
    ('/api/admin/vehiculos', admin_vehiculos, 'admin_vehiculos'),
    ('/api/admin/vehiculos/<int:vehiculo_id>', admin_vehiculo_detalle, 'admin_vehiculo_detalle'),
    ('/api/admin/citas', admin_citas, 'admin_citas'),
    ('/api/admin/ordenes', admin_ordenes, 'admin_ordenes'),
    ('/api/admin/ordenes/<int:orden_id>', obtener_orden_admin, 'obtener_orden_admin'),
    ('/api/admin/search', admin_search, 'admin_search'),
    ('/api/admin/notificaciones', admin_notificaciones, 'admin_notificaciones'),
    ('/api/admin/notificaciones/<int:notificacion_id>', admin_notificacion_detalle, 'admin_notificacion_detalle'),
    ('/api/admin/dashboard', admin_dashboard, 'admin_dashboard'),
    ('/api/admin/usuarios', admin_usuarios, 'admin_usuarios'),
    ('/api/admin/pagos', admin_pagos, 'admin_pagos'),
    ('/api/admin/pagos/<int:pago_id>', admin_pago_detalle, 'admin_pago_detalle'),
]:
    _register_compatibility_route(_rule, _view, _endpoint)

for _rule, _view, _endpoint, _methods in [
    ('/api/admin/servicios', crear_servicio_admin, 'crear_servicio_admin', ['POST']),
    ('/api/admin/servicios/<int:servicio_id>', actualizar_servicio_admin, 'actualizar_servicio_admin', ['PUT']),
    ('/api/admin/servicios/<int:servicio_id>', eliminar_servicio_admin, 'eliminar_servicio_admin', ['DELETE']),
    ('/api/admin/vehiculos', crear_vehiculo_admin, 'crear_vehiculo_admin', ['POST']),
    ('/api/admin/vehiculos/<int:vehiculo_id>', actualizar_vehiculo_admin, 'actualizar_vehiculo_admin', ['PUT']),
    ('/api/admin/vehiculos/<int:vehiculo_id>', eliminar_vehiculo_admin, 'eliminar_vehiculo_admin', ['DELETE']),
    ('/api/admin/citas', crear_cita_admin, 'crear_cita_admin', ['POST']),
    ('/api/admin/citas/<int:cita_id>/estado', actualizar_estado_cita, 'actualizar_estado_cita', ['PUT']),
    ('/api/admin/ordenes', crear_orden_admin, 'crear_orden_admin', ['POST']),
    ('/api/admin/ordenes/<int:orden_id>', actualizar_orden_admin, 'actualizar_orden_admin', ['PUT']),
    ('/api/admin/ordenes/<int:orden_id>', eliminar_orden_admin, 'eliminar_orden_admin', ['DELETE']),
    ('/api/admin/notificaciones', crear_notificacion_admin, 'crear_notificacion_admin', ['POST']),
    ('/api/admin/notificaciones/<int:notificacion_id>', admin_actualizar_notificacion, 'admin_actualizar_notificacion', ['PATCH']),
    ('/api/admin/citas/<int:cita_id>', admin_cita_detalle, 'admin_cita_detalle', ['GET', 'PUT', 'DELETE']),
    ('/api/admin/usuarios/<int:usuario_id>/rol', cambiar_rol_usuario, 'cambiar_rol_usuario', ['PUT']),
    ('/api/admin/usuarios/bulk', eliminar_usuarios, 'eliminar_usuarios', ['DELETE']),
]:
    _register_compatibility_route(_rule, _view, _endpoint, _methods)


def create_app(config=None):
    """Return the configured Flask application without changing its API."""
    if config:
        app.config.update(config)
    return app


__all__ = ['app', 'db', 'create_app']