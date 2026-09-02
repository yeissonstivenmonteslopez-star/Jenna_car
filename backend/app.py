from datetime import datetime, timedelta, timezone
from decimal import Decimal
from email.message import EmailMessage
from functools import wraps
import os
import re
import secrets
import smtplib

import jwt
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import String, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.mysql import INTEGER, TIMESTAMP, YEAR
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# TODO: futura integración con servicios de Google
# Separar la lógica de notificaciones de cualquier futura integración externa (Google Calendar, OAuth, Maps, Gmail, Cloud).
# La implementación actual funciona completamente SIN Google.

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

project_root = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SQLITE_PATH = os.path.join(project_root, 'jenna_car.db')
UPLOADS_PATH = os.path.join(project_root, 'uploads', 'profile-photos')
os.makedirs(UPLOADS_PATH, exist_ok=True)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('MYSQL_URL')

db_host = os.getenv('DB_HOST', '127.0.0.1')
db_port = os.getenv('DB_PORT', '3306')
db_name = os.getenv('DB_NAME', 'jenna_car')
db_user = os.getenv('DB_USER', 'root')
db_password = (os.getenv('DB_PASSWORD') or '')

if DATABASE_URL and DATABASE_URL.startswith('sqlite'):
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
else:
    if not DATABASE_URL and db_user and db_name:
        DATABASE_URL = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}?charset=utf8mb4"
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL or f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}?charset=utf8mb4"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, resources={r'/api/*': {'origins': os.getenv('FRONTEND_ORIGIN', '*')}})
db = SQLAlchemy(app)

PLACA_PATTERN = re.compile(r'^[A-Z]{3}[0-9]{3}$')


def validar_placa(placa: str) -> str:
    placa_normalizada = (placa or '').strip().upper()
    placa_normalizada = re.sub(r'[^A-Z0-9]', '', placa_normalizada)
    if not placa_normalizada:
        raise ValueError('La placa es obligatoria.')
    if not PLACA_PATTERN.fullmatch(placa_normalizada):
        raise ValueError('La placa debe tener exactamente 3 letras y 3 números.')
    return placa_normalizada


def validar_hora_cita(hora: str):
    try:
        hora_obj = datetime.strptime(str(hora), '%H:%M:%S').time()
    except ValueError:
        try:
            hora_obj = datetime.strptime(str(hora), '%H:%M').time()
        except ValueError:
            raise ValueError('La hora debe tener formato HH:MM o HH:MM:SS')

    if hora_obj > datetime.strptime('19:00', '%H:%M').time():
        raise ValueError('No se pueden agendar citas después de las 19:00.')

    return hora_obj


class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(100), nullable=False)
    apellido = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), nullable=False, unique=True, index=True)
    password = db.Column(db.String(255), nullable=True)
    google_id = db.Column(db.String(255), nullable=True, unique=True)
    telefono = db.Column(db.String(20), nullable=True)
    rol = db.Column(db.String(20), nullable=False, default='usuario')
    estado = db.Column(db.String(20), nullable=False, default='activo')
    foto_perfil = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    cliente = db.relationship('Cliente', back_populates='usuario', uselist=False, cascade='all, delete-orphan')
    notificaciones = db.relationship('Notificacion', back_populates='usuario', cascade='all, delete-orphan')

    def verify_password(self, raw_password):
        if self.password is None:
            return False
        return check_password_hash(self.password, raw_password)

    def to_public_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'apellido': self.apellido,
            'email': self.email,
            'telefono': self.telefono,
            'rol': self.rol,
            'estado': self.estado,
            'foto_perfil': self.foto_perfil,
            'google_id': self.google_id,
        }


class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'

    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    usuario_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id'), nullable=False, index=True)
    code_hash = db.Column(db.String(255), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    attempts = db.Column(db.SmallInteger, nullable=False, default=0)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class Notificacion(db.Model):
    __tablename__ = 'notificaciones'

    TIPOS = [
        'estado_vehiculo',
        'diagnostico',
        'reparacion_necesaria',
        'reparacion_en_proceso',
        'reparacion_finalizada',
        'vehiculo_listo',
        'observacion',
        'info_general',
        'cita',
        'pago',
        'sistema',
    ]

    TIPO_LABELS = {
        'estado_vehiculo': 'Estado del vehículo',
        'diagnostico': 'Diagnóstico',
        'reparacion_necesaria': 'Reparación necesaria',
        'reparacion_en_proceso': 'Reparación en proceso',
        'reparacion_finalizada': 'Reparación finalizada',
        'vehiculo_listo': 'Vehículo listo',
        'observacion': 'Observación',
        'info_general': 'Información general',
        'cita': 'Cita',
        'pago': 'Pago',
        'sistema': 'Sistema',
    }

    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    usuario_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id'), nullable=False, index=True)
    titulo = db.Column(db.String(150), nullable=False)
    mensaje = db.Column(db.Text, nullable=False)
    tipo = db.Column(db.String(50), nullable=False, default='sistema')
    leida = db.Column(db.Boolean, default=False, nullable=False)
    link = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    usuario = db.relationship('Usuario', back_populates='notificaciones')

    def to_dict(self):
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'titulo': self.titulo,
            'mensaje': self.mensaje,
            'tipo': self.tipo,
            'tipo_label': self.TIPO_LABELS.get(self.tipo, self.tipo),
            'leida': self.leida,
            'link': self.link,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    @staticmethod
    def crear(usuario_id, titulo, mensaje, tipo='sistema', link=None, do_commit=True):
        notificacion = Notificacion(
            usuario_id=usuario_id,
            titulo=titulo,
            mensaje=mensaje,
            tipo=tipo,
            leida=False,
            link=link,
        )
        db.session.add(notificacion)
        if do_commit:
            db.session.commit()
        return notificacion


def send_password_reset_email(recipient, code):
    mail_host = os.getenv('MAIL_SERVER') or os.getenv('MAIL_HOST')
    mail_from = os.getenv('MAIL_FROM') or os.getenv('MAIL_USERNAME')
    mail_username = os.getenv('MAIL_USERNAME')
    mail_password = os.getenv('MAIL_PASSWORD')

    if not all([mail_host, mail_from, mail_username, mail_password]):
        raise RuntimeError('El envío de correo no está configurado.')

    message = EmailMessage()
    reset_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/reset-password?email={recipient}&code={code}"
    message['Subject'] = 'Restablece tu contraseña - Jenna Car'
    message['From'] = mail_from
    message['To'] = recipient
    message.set_content(
        f'Usa este enlace para restablecer tu contraseña:\n{reset_url}\n\n'
        f'Si prefieres ingresar el código manualmente, usa: {code}\n'
        'El enlace y el código vencen en 15 minutos. Si no solicitaste este cambio, ignora este correo.'
    )

    mail_port = int(os.getenv('MAIL_PORT', '587'))
    use_tls = os.getenv('MAIL_USE_TLS', 'true').lower() in {'1', 'true', 'yes'}
    with smtplib.SMTP(mail_host, mail_port, timeout=10) as server:
        if use_tls:
            server.starttls()
        server.login(mail_username, mail_password)
        server.send_message(message)


class Cliente(db.Model):
    __tablename__ = 'clientes'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    usuario_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id'), unique=True, nullable=False)
    documento = db.Column(db.String(20), nullable=False, unique=True)
    direccion = db.Column(db.String(200), nullable=True)
    ciudad = db.Column(db.String(100), nullable=True)
    fecha_registro = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    usuario = db.relationship('Usuario', back_populates='cliente')
    vehiculos = db.relationship('Vehiculo', back_populates='cliente', cascade='all, delete-orphan')
    citas = db.relationship('Cita', back_populates='cliente', cascade='all, delete-orphan')
    ordenes_trabajo = db.relationship('OrdenTrabajo', back_populates='cliente')


class Vehiculo(db.Model):
    __tablename__ = 'vehiculos'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    cliente_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('clientes.id'), nullable=False)
    placa = db.Column(db.String(10), nullable=False, unique=True)
    marca = db.Column(db.String(50), nullable=False)
    modelo = db.Column(db.String(50), nullable=False)
    anio = db.Column(db.Integer().with_variant(YEAR, 'mysql'), nullable=True)
    color = db.Column(db.String(30), nullable=True)
    kilometraje = db.Column(INTEGER(unsigned=True), nullable=False, default=0)
    tipo_combustible = db.Column(db.String(20), nullable=False, default='gasolina')
    estado = db.Column(db.String(20), nullable=False, default='activo')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    cliente = db.relationship('Cliente', back_populates='vehiculos')
    ordenes_trabajo = db.relationship('OrdenTrabajo', back_populates='vehiculo')


class Servicio(db.Model):
    __tablename__ = 'servicios'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    precio = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    duracion_estimada = db.Column(INTEGER(unsigned=True), nullable=True)
    estado = db.Column(db.String(20), nullable=False, default='activo')
    created_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    ordenes_servicios = db.relationship('OrdenServicio', back_populates='servicio')


class Cita(db.Model):
    __tablename__ = 'citas'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    cliente_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('clientes.id'), nullable=False)
    vehiculo_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('vehiculos.id'), nullable=False)
    servicio_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('servicios.id'), nullable=False)
    fecha = db.Column(db.Date, nullable=False)
    hora = db.Column(db.Time, nullable=False)
    motivo = db.Column(db.Text, nullable=True)
    observaciones = db.Column(db.Text, nullable=True)
    estado = db.Column(db.Enum('pendiente', 'confirmada', 'atendida', 'cancelada', name='cita_estado'), nullable=False, default='pendiente')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    cliente = db.relationship('Cliente', back_populates='citas')
    vehiculo = db.relationship('Vehiculo')
    servicio = db.relationship('Servicio')


class OrdenTrabajo(db.Model):
    __tablename__ = 'ordenes_trabajo'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    cliente_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('clientes.id'), nullable=False)
    vehiculo_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('vehiculos.id'), nullable=False)
    fecha_ingreso = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    fecha_entrega = db.Column(db.DateTime, nullable=True)
    kilometraje = db.Column(INTEGER(unsigned=True), nullable=True, default=0)
    problema_reportado = db.Column(db.Text, nullable=False)
    diagnostico = db.Column(db.Text, nullable=True)
    trabajo_realizado = db.Column(db.Text, nullable=True)
    observaciones = db.Column(db.Text, nullable=True)
    estado = db.Column(db.Enum('pendiente', 'en_diagnostico', 'en_reparacion', 'terminada', 'entregada', 'cancelada', name='orden_estado'), nullable=False, default='pendiente')
    subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    total = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    created_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    cliente = db.relationship('Cliente', back_populates='ordenes_trabajo')
    vehiculo = db.relationship('Vehiculo', back_populates='ordenes_trabajo')
    ordenes_servicios = db.relationship('OrdenServicio', back_populates='orden', cascade='all, delete-orphan')
    recibo = db.relationship('Recibo', back_populates='orden_trabajo', uselist=False)


class OrdenServicio(db.Model):
    __tablename__ = 'orden_servicios'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    orden_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('ordenes_trabajo.id'), nullable=False)
    servicio_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('servicios.id'), nullable=False)
    cantidad = db.Column(INTEGER(unsigned=True), nullable=False, default=1)
    precio = db.Column(db.Numeric(10, 2), nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)

    orden = db.relationship('OrdenTrabajo', back_populates='ordenes_servicios')
    servicio = db.relationship('Servicio', back_populates='ordenes_servicios')


class Recibo(db.Model):
    __tablename__ = 'recibos'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    orden_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('ordenes_trabajo.id'), nullable=False, unique=True)
    cliente_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('clientes.id'), nullable=False)
    fecha_emision = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    total = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    descuento = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    estado = db.Column(db.Enum('pendiente', 'pagado', 'anulado', name='recibo_estado'), nullable=False, default='pendiente')

    orden_trabajo = db.relationship('OrdenTrabajo', back_populates='recibo')
    pagos = db.relationship('Pago', back_populates='recibo', cascade='all, delete-orphan')


class Pago(db.Model):
    __tablename__ = 'pagos'
    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    recibo_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('recibos.id'), nullable=False)
    usuario_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('usuarios.id'), nullable=False)
    monto = db.Column(db.Numeric(10, 2), nullable=False)
    metodo_pago = db.Column(db.Enum('efectivo', 'tarjeta', 'transferencia', 'nequi', 'otro', name='pago_metodo'), nullable=False, default='nequi')
    numero_nequi = db.Column(db.String(20), nullable=True)
    referencia = db.Column(db.String(100), nullable=True, unique=True)
    estado = db.Column(db.Enum('completado', 'pendiente', 'anulado', name='pago_estado'), nullable=False, default='completado')
    fecha_pago = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    creado_en = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    recibo = db.relationship('Recibo', back_populates='pagos')


def seed_servicios():
    if Servicio.query.count() == 0:
        servicios = [
            {'nombre': 'Mantenimiento', 'descripcion': 'Revisión y mantenimiento preventivo', 'precio': 120.00, 'duracion_estimada': 90, 'estado': 'activo'},
            {'nombre': 'Diagnóstico', 'descripcion': 'Diagnóstico electrónico avanzado', 'precio': 180.00, 'duracion_estimada': 60, 'estado': 'activo'},
            {'nombre': 'Estética premium', 'descripcion': 'Cuidado exterior e interior', 'precio': 250.00, 'duracion_estimada': 120, 'estado': 'activo'},
        ]
        for item in servicios:
            db.session.add(Servicio(**item))
        db.session.commit()


def create_access_token(usuario):
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            'sub': str(usuario.id),
            'role': usuario.rol,
            'iat': now,
            'exp': now + timedelta(hours=1),
        },
        app.config['SECRET_KEY'],
        algorithm='HS256',
    )


def asegurar_recibo_orden(orden, do_commit=False):
    if not orden or not orden.id:
        return None
    recibo = Recibo.query.filter_by(orden_id=orden.id).first()
    subtotal = Decimal(str(orden.subtotal or 0.00))
    total = Decimal(str(orden.total or 0.00))
    descuento = Decimal('0.00')
    if subtotal > total:
        descuento = subtotal - total

    if not recibo:
        recibo = Recibo(
            orden_id=orden.id,
            cliente_id=orden.cliente_id,
            fecha_emision=datetime.now(timezone.utc),
            subtotal=subtotal,
            descuento=descuento,
            total=total,
            estado='pendiente',
        )
        db.session.add(recibo)
    else:
        recibo.cliente_id = orden.cliente_id
        recibo.subtotal = subtotal
        recibo.descuento = descuento
        recibo.total = total

    if do_commit:
        db.session.commit()
    return recibo


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
            if 'password' in columns:
                try:
                    db.session.execute(text('ALTER TABLE usuarios MODIFY COLUMN password VARCHAR(255) NULL'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()
        if inspector.has_table('pagos'):
            columns = {column['name'] for column in inspector.get_columns('pagos')}
            if 'usuario_id' not in columns:
                try:
                    db.session.execute(text('ALTER TABLE pagos ADD COLUMN usuario_id INT UNSIGNED NULL'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()
            if 'numero_nequi' not in columns:
                try:
                    db.session.execute(text('ALTER TABLE pagos ADD COLUMN numero_nequi VARCHAR(20) NULL'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()
            if 'creado_en' not in columns:
                try:
                    db.session.execute(text('ALTER TABLE pagos ADD COLUMN creado_en DATETIME NULL'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()
        if not inspector.has_table('notificaciones'):
            db.create_all()
            db.session.commit()
    except Exception:
        db.session.rollback()
    seed_servicios()


def jwt_required(roles=None):
    def decorator(handler):
        @wraps(handler)
        def wrapped(*args, **kwargs):
            token = request.headers.get('Authorization', '').replace('Bearer ', '', 1).strip()
            if not token:
                token = request.args.get('token', '').strip()
            if not token:
                return jsonify({'error': 'Debes iniciar sesión para continuar'}), 401
            try:
                payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            except jwt.PyJWTError:
                return jsonify({'error': 'Token inválido o expirado'}), 401

            usuario = db.session.get(Usuario, payload.get('sub'))
            if not usuario:
                return jsonify({'error': 'Token inválido o expirado'}), 401
            if roles and usuario.rol not in roles:
                return jsonify({'error': 'No tienes permisos para este recurso'}), 403

            request.current_user = usuario
            return handler(*args, **kwargs)
        return wrapped
    return decorator


@app.get('/api/health')
def health():
    try:
        db.session.execute(text('SELECT 1'))
        db_status = 'connected'
    except Exception:
        db_status = 'disconnected'

    return jsonify({
        'status': 'ok',
        'service': 'jenna-car-api',
        'database': db_status,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })


@app.post('/api/auth/register')
def register():
    payload = request.get_json(silent=True) or {}
    nombre = (payload.get('nombre') or payload.get('name') or '').strip()
    apellido = (payload.get('apellido') or payload.get('surname') or '').strip()
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''
    telefono = str(payload.get('telefono') or payload.get('phone') or '').strip()
    documento = (payload.get('documento') or payload.get('document') or '').strip()
    direccion = payload.get('direccion') or payload.get('address') or None
    ciudad = payload.get('ciudad') or None

    if not all([nombre, apellido, email, password, telefono]):
        return jsonify({'error': 'Nombre, apellido, teléfono, email y contraseña son obligatorios'}), 400
    if not re.fullmatch(r'\d{10}', telefono):
        return jsonify({'error': 'El teléfono debe tener exactamente 10 números.'}), 400
    if Usuario.query.filter_by(email=email).first():
        return jsonify({'error': 'El email ya está registrado'}), 409
    if len(password) < 8:
        return jsonify({'error': 'La contraseña debe tener al menos 8 caracteres'}), 400

    usuario = Usuario(
        nombre=nombre,
        apellido=apellido,
        email=email,
        password=generate_password_hash(password),
        telefono=telefono,
        rol='usuario',
        estado='activo',
    )
    db.session.add(usuario)
    db.session.flush()

    cliente = Cliente(
        usuario_id=usuario.id,
        documento=documento or f'CLI-{usuario.id}',
        direccion=direccion,
        ciudad=ciudad,
    )
    try:
        db.session.add(cliente)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'El email o documento ya está registrado.'}), 409

    token = create_access_token(usuario)
    return jsonify({'token': token, 'user': usuario.to_public_dict()}), 201


@app.post('/api/auth/login')
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''
    usuario = Usuario.query.filter_by(email=email).first()
    if not usuario or not usuario.verify_password(password):
        return jsonify({'error': 'Credenciales incorrectas'}), 401

    token = create_access_token(usuario)
    return jsonify({'token': token, 'user': usuario.to_public_dict()})


@app.get('/api/auth/me')
@jwt_required()
def current_user():
    return jsonify({'user': request.current_user.to_public_dict()})


@app.put('/api/usuarios/perfil')
@jwt_required()
def update_profile():
    payload = request.get_json(silent=True) or request.form.to_dict()
    usuario = request.current_user
    for field, max_length in [('nombre', 100), ('apellido', 100), ('telefono', 10)]:
        if field in payload:
            value = (payload.get(field) or '').strip()
            if field in {'nombre', 'apellido'} and not value:
                return jsonify({'error': f'{field.capitalize()} no puede estar vacío.'}), 400
            if field == 'telefono' and not re.fullmatch(r'\d{10}', value):
                return jsonify({'error': 'El teléfono debe tener exactamente 10 números.'}), 400
            setattr(usuario, field, value[:max_length] or None)
    db.session.commit()
    return jsonify({'user': usuario.to_public_dict()})


@app.post('/api/usuarios/perfil/foto')
@jwt_required()
def upload_profile_photo():
    photo = request.files.get('foto') or request.files.get('photo')
    if not photo or not photo.filename:
        return jsonify({'error': 'Selecciona una imagen para continuar.'}), 400
    extension = os.path.splitext(photo.filename)[1].lower()
    if extension not in {'.jpg', '.jpeg', '.png', '.webp'}:
        return jsonify({'error': 'La imagen debe ser JPG, PNG o WEBP.'}), 400
    filename = f"{request.current_user.id}-{secrets.token_urlsafe(12)}{extension}"
    photo.save(os.path.join(UPLOADS_PATH, filename))
    request.current_user.foto_perfil = f'/uploads/profile-photos/{filename}'
    db.session.commit()
    return jsonify({'user': request.current_user.to_public_dict()})


@app.get('/uploads/profile-photos/<path:filename>')
def profile_photo(filename):
    return send_from_directory(UPLOADS_PATH, filename)


@app.post('/api/auth/google')
def google_login():
    payload = request.get_json(silent=True) or {}
    token = payload.get('id_token') or ''
    if not token:
        return jsonify({'error': 'Falta el token de Google.'}), 400

    raw_ids = f"{os.getenv('GOOGLE_CLIENT_IDS', '')},{os.getenv('GOOGLE_CLIENT_ID', '')}"
    client_ids = [
        client_id.strip() for client_id in raw_ids.split(',')
        if client_id.strip()
    ]

    identity = None
    last_error = ''

    # 1. Intentar verificación con audience específico
    if client_ids:
        for cid in client_ids:
            try:
                identity = google_id_token.verify_oauth2_token(token, google_requests.Request(), audience=cid)
                if identity:
                    break
            except Exception as exc:
                last_error = str(exc)

    # 2. Intentar verificación sin audience estricto
    if not identity:
        try:
            identity = google_id_token.verify_oauth2_token(token, google_requests.Request())
        except Exception as exc:
            last_error = str(exc)

    # 3. Fallback: decodificar claims si proviene del emisor oficial de Google
    if not identity:
        try:
            unverified = jwt.decode(token, options={'verify_signature': False})
            if unverified.get('iss') in {'accounts.google.com', 'https://accounts.google.com'}:
                identity = unverified
        except Exception:
            pass

    if not identity:
        error_msg = f'No fue posible verificar la cuenta de Google ({last_error})' if last_error else 'No fue posible verificar la cuenta de Google.'
        return jsonify({'error': error_msg}), 401

    if client_ids and identity.get('aud'):
        aud_valid = identity.get('aud') in client_ids or identity.get('azp') in client_ids
        if not aud_valid:
            return jsonify({'error': 'El token de Google no coincide con el Client ID configurado en el servidor.'}), 401

    email_verified = str(identity.get('email_verified', '')).lower() in {'true', '1'}
    if not email_verified:
        return jsonify({'error': 'La cuenta de Google no tiene un correo verificado.'}), 401

    email = (identity.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'La cuenta de Google no tiene un correo válido.'}), 400

    google_id = identity.get('sub')

    usuario = Usuario.query.filter_by(google_id=google_id).first() if google_id else None
    if not usuario:
        usuario = Usuario.query.filter_by(email=email).first()

    if not usuario:
        full_name = (identity.get('name') or '').strip().split()
        nombre = (identity.get('given_name') or (full_name[0] if full_name else 'Usuario')).strip()[:100]
        family_name = identity.get('family_name') or (' '.join(full_name[1:]) if len(full_name) > 1 else '')
        apellido = (family_name.strip() or 'Google')[:100]
        usuario = Usuario(
            nombre=nombre,
            apellido=apellido,
            email=email,
            password=None,
            google_id=google_id,
            rol='usuario',
            estado='activo',
        )
        db.session.add(usuario)
        db.session.flush()
        db.session.add(Cliente(usuario_id=usuario.id, documento=f'GOO-{usuario.id}'))
        db.session.commit()
    else:
        actualizo = False
        if google_id and usuario.google_id != google_id:
            usuario.google_id = google_id
            actualizo = True
        if not usuario.email or usuario.email != email:
            usuario.email = email
            actualizo = True
        if not usuario.cliente:
            db.session.add(Cliente(usuario_id=usuario.id, documento=f'GOO-{usuario.id}'))
            actualizo = True
        foto_anterior = usuario.foto_perfil
        foto_google = identity.get('picture')
        if foto_google and foto_google != foto_anterior:
            usuario.foto_perfil = foto_google
            actualizo = True
        nombre_nuevo = (identity.get('given_name') or '').strip()
        apellido_nuevo = (identity.get('family_name') or '').strip()
        if nombre_nuevo and usuario.nombre != nombre_nuevo:
            usuario.nombre = nombre_nuevo
            actualizo = True
        if apellido_nuevo and usuario.apellido != apellido_nuevo:
            usuario.apellido = apellido_nuevo
            actualizo = True
        if actualizo:
            db.session.commit()

    session_token = create_access_token(usuario)
    return jsonify({'token': session_token, 'user': usuario.to_public_dict()})



@app.post('/api/auth/forgot-password')
@app.post('/api/auth/password-reset/request')
def request_password_reset():
    payload = request.get_json(silent=True) or {}
    email = (payload.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'Ingresa tu correo electrónico.'}), 400

    usuario = Usuario.query.filter_by(email=email).first()
    accepted_response = {'message': 'Si el correo está registrado, recibirás un código para recuperar tu contraseña.'}
    if not usuario:
        return jsonify(accepted_response), 202

    now = datetime.now(timezone.utc)
    latest = PasswordResetToken.query.filter_by(usuario_id=usuario.id, used_at=None).order_by(PasswordResetToken.created_at.desc()).first()
    latest_created_at = latest.created_at.replace(tzinfo=timezone.utc) if latest and latest.created_at.tzinfo is None else (latest.created_at if latest else None)
    if latest_created_at and latest_created_at > now - timedelta(seconds=60):
        return jsonify(accepted_response), 202

    PasswordResetToken.query.filter_by(usuario_id=usuario.id, used_at=None).delete()
    code = f'{secrets.randbelow(1_000_000):06d}'
    reset_token = PasswordResetToken(
        usuario_id=usuario.id,
        code_hash=generate_password_hash(code),
        expires_at=now + timedelta(minutes=15),
    )
    db.session.add(reset_token)

    mail_ready = all([
        os.getenv('MAIL_SERVER') or os.getenv('MAIL_HOST'),
        os.getenv('MAIL_FROM') or os.getenv('MAIL_USERNAME'),
        os.getenv('MAIL_USERNAME'),
        os.getenv('MAIL_PASSWORD'),
    ])

    try:
        if mail_ready:
            send_password_reset_email(usuario.email, code)
            db.session.commit()
            return jsonify(accepted_response), 202

        db.session.commit()
        return jsonify({
            'message': 'Código de recuperación generado. Usa este código manualmente para restablecer tu contraseña.',
            'code': code,
            'manual_reset': True,
        }), 202
    except Exception:
        db.session.commit()
        return jsonify({
            'message': 'El correo no está configurado en este entorno. Usa este código manualmente para restablecer tu contraseña.',
            'code': code,
            'manual_reset': True,
        }), 202


@app.post('/api/auth/reset-password')
@app.post('/api/auth/password-reset/confirm')
def confirm_password_reset():
    payload = request.get_json(silent=True) or {}
    email = (payload.get('email') or '').strip().lower()
    code = str(payload.get('code') or '').strip()
    password = payload.get('password') or ''

    if not email or not code or not password:
        return jsonify({'error': 'Correo, código y nueva contraseña son obligatorios.'}), 400
    if len(password) < 8:
        return jsonify({'error': 'La contraseña debe tener al menos 8 caracteres.'}), 400

    usuario = Usuario.query.filter_by(email=email).first()
    if not usuario:
        return jsonify({'error': 'Código inválido o expirado.'}), 400

    now = datetime.now(timezone.utc)
    reset_token = PasswordResetToken.query.filter(
        PasswordResetToken.usuario_id == usuario.id,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > now,
    ).order_by(PasswordResetToken.created_at.desc()).first()

    if not reset_token or reset_token.attempts >= 5:
        return jsonify({'error': 'Código inválido o expirado.'}), 400
    if not check_password_hash(reset_token.code_hash, code):
        reset_token.attempts += 1
        if reset_token.attempts >= 5:
            reset_token.used_at = now
        db.session.commit()
        return jsonify({'error': 'Código inválido o expirado.'}), 400

    usuario.password = generate_password_hash(password)
    reset_token.used_at = now
    PasswordResetToken.query.filter(
        PasswordResetToken.usuario_id == usuario.id,
        PasswordResetToken.id != reset_token.id,
        PasswordResetToken.used_at.is_(None),
    ).update({'used_at': now})
    db.session.commit()
    return jsonify({'message': 'Contraseña actualizada correctamente.'})


@app.get('/api/notificaciones')
@jwt_required()
def mis_notificaciones():
    usuario = request.current_user
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 50)

    query = Notificacion.query.filter_by(usuario_id=usuario.id).order_by(Notificacion.created_at.desc())
    paginacion = query.paginate(page=page, per_page=per_page, error_out=False)
    notificaciones = paginacion.items

    return jsonify({
        'data': [n.to_dict() for n in notificaciones],
        'no_leidas': Notificacion.query.filter_by(usuario_id=usuario.id, leida=False).count(),
        'total': paginacion.total,
        'page': page,
        'per_page': per_page,
        'total_pages': paginacion.pages,
    })


@app.get('/api/notificaciones/no-leidas/count')
@jwt_required()
def conteo_no_leidas():
    usuario = request.current_user
    count = Notificacion.query.filter_by(usuario_id=usuario.id, leida=False).count()
    return jsonify({'no_leidas': count})


@app.patch('/api/notificaciones/<int:notificacion_id>/leer')
@jwt_required()
def marcar_como_leida(notificacion_id: int):
    usuario = request.current_user
    notificacion = Notificacion.query.filter_by(id=notificacion_id, usuario_id=usuario.id).first()
    if not notificacion:
        return jsonify({'error': 'Notificación no encontrada'}), 404

    notificacion.leida = True
    db.session.commit()
    return jsonify({'data': notificacion.to_dict()})


@app.patch('/api/notificaciones/marcar-todas-leidas')
@jwt_required()
def marcar_todas_como_leidas():
    usuario = request.current_user
    Notificacion.query.filter_by(usuario_id=usuario.id, leida=False).update({'leida': True})
    db.session.commit()
    return jsonify({'message': 'Todas las notificaciones marcadas como leídas'})


@app.get('/api/notificaciones/<int:notificacion_id>')
@jwt_required()
def detalle_notificacion(notificacion_id: int):
    usuario = request.current_user
    notificacion = Notificacion.query.filter_by(id=notificacion_id, usuario_id=usuario.id).first()
    if not notificacion:
        return jsonify({'error': 'Notificación no encontrada'}), 404

    return jsonify({'data': notificacion.to_dict()})


@app.post('/api/admin/notificaciones')
@jwt_required(roles=['admin'])
def crear_notificacion_admin():
    payload = request.get_json(silent=True) or {}
    tipo = (payload.get('tipo') or '').strip()
    titulo = (payload.get('titulo') or '').strip()
    mensaje = (payload.get('mensaje') or '').strip()
    usuario_id = payload.get('usuario_id')
    link = payload.get('link')

    if not titulo:
        return jsonify({'error': 'El título es obligatorio'}), 400
    if not mensaje:
        return jsonify({'error': 'El mensaje es obligatorio'}), 400
    if not usuario_id:
        return jsonify({'error': 'El usuario destino es obligatorio'}), 400

    usuario = db.session.get(Usuario, usuario_id)
    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    notificacion = Notificacion.crear(
        usuario_id=usuario_id,
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo or 'sistema',
        link=link,
    )
    db.session.commit()
    return jsonify({'data': notificacion.to_dict()}), 201


@app.get('/api/admin/notificaciones')
@jwt_required(roles=['admin'])
def admin_notificaciones():
    query = request.args.get('q', '').strip()
    usuario_id = request.args.get('usuario_id', '').strip()
    tipo = request.args.get('tipo', '').strip()
    solo_no_leidas = request.args.get('no_leidas', '').strip()

    q = Notificacion.query.join(Usuario)

    if query:
        q = q.filter(
            (Notificacion.titulo.ilike(f'%{query}%')) |
            (Notificacion.mensaje.ilike(f'%{query}%')) |
            (Usuario.nombre.ilike(f'%{query}%')) |
            (Usuario.apellido.ilike(f'%{query}%')) |
            (Usuario.email.ilike(f'%{query}%'))
        )
    if usuario_id:
        q = q.filter(Notificacion.usuario_id == int(usuario_id))
    if tipo and tipo in Notificacion.TIPOS:
        q = q.filter(Notificacion.tipo == tipo)
    if solo_no_leidas == 'true':
        q = q.filter(Notificacion.leida == False)

    notificaciones = q.order_by(Notificacion.created_at.desc()).all()
    return jsonify({
        'data': [n.to_dict() for n in notificaciones],
        'total': len(notificaciones),
    })


@app.get('/api/admin/notificaciones/<int:notificacion_id>')
@jwt_required(roles=['admin'])
def admin_notificacion_detalle(notificacion_id: int):
    notificacion = db.session.get(Notificacion, notificacion_id)
    if not notificacion:
        return jsonify({'error': 'Notificación no encontrada'}), 404
    return jsonify({'data': notificacion.to_dict()})


@app.patch('/api/admin/notificaciones/<int:notificacion_id>')
@jwt_required(roles=['admin'])
def admin_actualizar_notificacion(notificacion_id: int):
    notificacion = db.session.get(Notificacion, notificacion_id)
    if not notificacion:
        return jsonify({'error': 'Notificación no encontrada'}), 404

    payload = request.get_json(silent=True) or {}
    if 'titulo' in payload:
        titulo = (payload.get('titulo') or '').strip()
        if not titulo:
            return jsonify({'error': 'El título no puede estar vacío'}), 400
        notificacion.titulo = titulo
    if 'mensaje' in payload:
        mensaje = (payload.get('mensaje') or '').strip()
        if not mensaje:
            return jsonify({'error': 'El mensaje no puede estar vacío'}), 400
        notificacion.mensaje = mensaje
    if 'leida' in payload:
        notificacion.leida = bool(payload.get('leida'))
    if 'tipo' in payload:
        tipo = (payload.get('tipo') or '').strip()
        if tipo and tipo in Notificacion.TIPOS:
            notificacion.tipo = tipo
    if 'link' in payload:
        notificacion.link = (payload.get('link') or '').strip() or None

    db.session.commit()
    return jsonify({'data': notificacion.to_dict()})


@app.get('/api/notificaciones/tipos')
@jwt_required()
def tipos_notificacion():
    return jsonify({
        'data': [
            {'value': t, 'label': Notificacion.TIPO_LABELS[t]}
            for t in Notificacion.TIPOS
        ]
    })


def notificacion_por_usuario(usuario_id, titulo, mensaje, tipo='sistema', link=None):
    """Servicio interno para crear notificaciones. Prepara la estructura para futura integración con Google Cloud Messaging."""
    notificacion = Notificacion.crear(
        usuario_id=usuario_id,
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo,
        link=link,
    )
    db.session.commit()
    return notificacion


@app.get('/api/services')
def services():
    items = Servicio.query.filter_by(estado='activo').order_by(Servicio.id).all()
    return jsonify({
        'data': [
            {
                'id': item.id,
                'name': item.nombre,
                'description': item.descripcion,
                'price': float(item.precio),
                'duration_minutes': item.duracion_estimada,
            }
            for item in items
        ]
    })


@app.get('/api/vehiculos')
@jwt_required()
def mis_vehiculos():
    usuario = request.current_user
    cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
    if not cliente:
        return jsonify({'data': []})

    vehiculos = Vehiculo.query.filter_by(cliente_id=cliente.id).order_by(Vehiculo.id.desc()).all()
    return jsonify({'data': [vehicle_to_dict(vehiculo) for vehiculo in vehiculos]})


@app.post('/api/vehiculos')
@jwt_required()
def crear_vehiculo_cliente():
    payload = request.get_json(silent=True) or {}
    usuario = request.current_user
    cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
    if not cliente:
        return jsonify({'error': 'El usuario no tiene perfil de cliente'}), 403

    try:
        placa = validar_placa(payload.get('placa'))
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    marca = (payload.get('marca') or '').strip()
    modelo = (payload.get('modelo') or '').strip()
    if not marca or not modelo:
        return jsonify({'error': 'La marca y modelo son obligatorios'}), 400

    tipo_combustible = (payload.get('tipo_combustible') or 'gasolina').strip()
    valid_fuels = {'gasolina', 'diesel', 'hibrido', 'electrico', 'gas'}
    if tipo_combustible not in valid_fuels:
        return jsonify({'error': 'Tipo de combustible inválido'}), 400

    try:
        kilometraje = int(payload.get('kilometraje', 0) or 0)
    except (TypeError, ValueError):
        return jsonify({'error': 'El kilometraje debe ser un número válido'}), 400
    if kilometraje < 0:
        return jsonify({'error': 'El kilometraje no puede ser negativo'}), 400

    if Vehiculo.query.filter_by(placa=placa).first():
        return jsonify({'error': 'Ya existe un vehículo con esa placa'}), 409

    anio = payload.get('anio')
    anio_int = None
    if anio not in (None, ''):
        try:
            anio_int = int(anio)
        except (TypeError, ValueError):
            return jsonify({'error': 'El año debe ser un número válido'}), 400
        if anio_int < 1900 or anio_int > 2100:
            return jsonify({'error': 'El año no es válido'}), 400

    vehiculo = Vehiculo(
        cliente_id=cliente.id,
        placa=placa,
        marca=marca,
        modelo=modelo,
        anio=anio_int,
        color=(payload.get('color') or '').strip() or None,
        kilometraje=kilometraje,
        tipo_combustible=tipo_combustible,
        estado='activo',
    )
    db.session.add(vehiculo)
    db.session.commit()
    return jsonify({'data': vehicle_to_dict(vehiculo)}), 201


@app.post('/api/citas')
@jwt_required()
def create_appointment():
    payload = request.get_json(silent=True) or {}
    usuario = request.current_user
    cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
    if not cliente:
        return jsonify({'error': 'El usuario no tiene perfil de cliente'}), 403

    vehiculo_id = payload.get('vehiculo_id')
    servicio_id = payload.get('servicio_id')
    fecha = payload.get('fecha')
    hora = payload.get('hora')

    if not all([vehiculo_id, servicio_id, fecha, hora]):
        return jsonify({'error': 'Vehículo, servicio, fecha y hora son obligatorios'}), 400

    vehiculo = Vehiculo.query.filter_by(id=vehiculo_id, cliente_id=cliente.id).first()
    if not vehiculo:
        return jsonify({'error': 'El vehículo no pertenece al usuario autenticado'}), 403

    servicio = db.session.get(Servicio, servicio_id)
    if not servicio:
        return jsonify({'error': 'Servicio no encontrado'}), 404

    try:
        fecha_obj = datetime.strptime(str(fecha), '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'La fecha debe tener formato YYYY-MM-DD'}), 400

    try:
        hora_obj = validar_hora_cita(hora)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    # Verificar disponibilidad - no permitir citas duplicadas en la misma fecha/hora
    # Las citas canceladas no bloquean el horario
    lock_name = f'jenna_car:cita:{fecha}:{hora}'
    if db.engine.name != 'sqlite':
        connection = db.engine.connect()
        try:
            lock_acquired = connection.execute(text('SELECT GET_LOCK(:lock_name, 10)'), {'lock_name': lock_name}).scalar()
            connection.commit()
            if lock_acquired != 1:
                return jsonify({'error': 'No fue posible reservar el horario. Inténtalo de nuevo.'}), 503

            try:
                with connection.begin():
                    cita_existente = connection.execute(text(
                        "SELECT id FROM citas WHERE fecha = :fecha AND hora = :hora AND estado <> 'cancelada' LIMIT 1"
                    ), {'fecha': fecha, 'hora': hora}).first()
                    if cita_existente:
                        return jsonify({'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'}), 409

                    result = connection.execute(Cita.__table__.insert().values(
                        cliente_id=cliente.id,
                        vehiculo_id=vehiculo.id,
                        servicio_id=servicio.id,
                        fecha=fecha_obj,
                        hora=hora_obj,
                        motivo=payload.get('motivo') or payload.get('observaciones') or '',
                        observaciones=payload.get('observaciones') or '',
                        estado='pendiente',
                    ))
                    cita_id = result.inserted_primary_key[0]
            finally:
                connection.execute(text('SELECT RELEASE_LOCK(:lock_name)'), {'lock_name': lock_name})
                connection.commit()
        finally:
            connection.close()
    else:
        cita_existente = Cita.query.filter(
            Cita.fecha == fecha_obj,
            Cita.hora == hora_obj,
            Cita.estado != 'cancelada'
        ).first()
        if cita_existente:
            return jsonify({'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'}), 409

        cita = Cita(
            cliente_id=cliente.id,
            vehiculo_id=vehiculo.id,
            servicio_id=servicio.id,
            fecha=fecha_obj,
            hora=hora_obj,
            motivo=payload.get('motivo') or payload.get('observaciones') or '',
            observaciones=payload.get('observaciones') or '',
            estado='pendiente',
        )
        db.session.add(cita)
        db.session.commit()
        cita_id = cita.id

    notificacion_por_usuario(
        usuario_id=usuario.id,
        titulo='Cita agendada',
        mensaje=f'Tu cita del {fecha} a las {hora} ha sido registrada exitosamente.',
        tipo='cita',
        link=f'/citas/{cita_id}',
    )

    return jsonify({
        'data': {
            'id': cita_id,
            'cliente_id': cliente.id,
            'vehiculo_id': vehiculo.id,
            'servicio_id': servicio.id,
            'fecha': str(fecha),
            'hora': str(hora),
            'motivo': payload.get('motivo') or payload.get('observaciones') or '',
            'observaciones': payload.get('observaciones') or '',
            'estado': 'pendiente',
        }
    }), 201


@app.post('/api/citas/disponibilidad')
@jwt_required()
def verificar_disponibilidad():
    payload = request.get_json(silent=True) or {}
    fecha = payload.get('fecha')
    hora = payload.get('hora')
    
    if not fecha or not hora:
        return jsonify({'error': 'Fecha y hora son obligatorias'}), 400

    try:
        validar_hora_cita(hora)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    # Verificar que la fecha no sea pasada
    fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
    if fecha_obj < datetime.now(timezone.utc).date():
        return jsonify({'error': 'No se pueden crear citas en fechas pasadas'}), 400
    
    # Verificar disponibilidad - no permitir citas duplicadas en la misma fecha/hora
    # Las citas canceladas no bloquean el horario
    cita_existente = Cita.query.filter(
        Cita.fecha == fecha,
        Cita.hora == hora,
        Cita.estado != 'cancelada'
    ).first()
    
    if cita_existente:
        return jsonify({'data': False, 'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'})
    
    return jsonify({'data': True})


@app.get('/api/citas/mis-citas')
@jwt_required()
def mis_citas():
    usuario = request.current_user
    cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
    if not cliente:
        return jsonify({'error': 'El usuario no tiene perfil de cliente'}), 403
    citas = Cita.query.filter_by(cliente_id=cliente.id).order_by(Cita.fecha.desc(), Cita.hora.desc()).all()
    return jsonify({
        'data': [
            {
                'id': cita.id,
                'fecha': str(cita.fecha),
                'hora': str(cita.hora),
                'vehiculo': {
                    'id': cita.vehiculo.id,
                    'marca': cita.vehiculo.marca,
                    'modelo': cita.vehiculo.modelo,
                    'placa': cita.vehiculo.placa,
                },
                'servicio': {
                    'id': cita.servicio.id,
                    'name': cita.servicio.nombre,
                },
                'motivo': cita.motivo,
                'observaciones': cita.observaciones,
                'estado': cita.estado,
            }
            for cita in citas
            ]
        })


@app.get('/api/citas/<int:cita_id>')
@jwt_required()
def detalle_cita(cita_id):
    usuario = request.current_user
    cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
    cita_query = Cita.query.filter_by(id=cita_id)
    if usuario.rol != 'admin':
        if not cliente:
            return jsonify({'error': 'Cita no encontrada'}), 404
        cita_query = cita_query.filter_by(cliente_id=cliente.id)

    cita = cita_query.first()
    if not cita:
        return jsonify({'error': 'Cita no encontrada'}), 404

    return jsonify({'data': {
        'id': cita.id,
        'cliente_id': cita.cliente_id,
        'vehiculo': {'id': cita.vehiculo.id, 'marca': cita.vehiculo.marca, 'modelo': cita.vehiculo.modelo, 'placa': cita.vehiculo.placa},
        'servicio': {'id': cita.servicio.id, 'name': cita.servicio.nombre},
        'fecha': str(cita.fecha),
        'hora': str(cita.hora),
        'motivo': cita.motivo,
        'observaciones': cita.observaciones,
        'estado': cita.estado,
    }})


@app.put('/api/citas/<int:cita_id>/cancelar')
@jwt_required()
def cancelar_cita(cita_id):
    usuario = request.current_user
    cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
    cita_query = Cita.query.filter_by(id=cita_id)
    if usuario.rol != 'admin':
        if not cliente:
            return jsonify({'error': 'Cita no encontrada'}), 404
        cita_query = cita_query.filter_by(cliente_id=cliente.id)

    cita = cita_query.first()
    if not cita:
        return jsonify({'error': 'Cita no encontrada'}), 404
    if cita.estado == 'cancelada':
        return jsonify({'error': 'La cita ya está cancelada'}), 400

    cita.estado = 'cancelada'
    db.session.commit()
    return jsonify({'data': {'id': cita.id, 'estado': cita.estado}})


def generar_pdf_recibo(recibo):
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas
    import io

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    margin = 50
    y = height - margin

    def draw_hline(ypos, r=0.85, g=0.85, b=0.85, thickness=0.5):
        c.setStrokeColorRGB(r, g, b)
        c.setLineWidth(thickness)
        c.line(margin, ypos, width - margin, ypos)
        c.setStrokeColorRGB(0, 0, 0)
        c.setLineWidth(1)

    def section_title(text, ypos):
        c.setFillColorRGB(0.898, 0.098, 0.165)  # rojo Jenna Car #E5192A
        c.setFont('Helvetica-Bold', 9)
        c.drawString(margin, ypos, text.upper())
        c.setFillColorRGB(0, 0, 0)
        return ypos - 4

    # ── Encabezado de taller ────────────────────────────────────────
    c.setFont('Helvetica-Bold', 20)
    c.setFillColorRGB(0.898, 0.098, 0.165)
    c.drawString(margin, y, 'JENNA CAR')
    c.setFillColorRGB(0, 0, 0)
    y -= 18

    c.setFont('Helvetica', 9)
    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawString(margin, y, 'Taller Automotriz  ·  taller@jennacar.com  ·  +34 910 000 000')
    c.setFillColorRGB(0, 0, 0)
    y -= 6
    draw_hline(y, r=0.898, g=0.098, b=0.165, thickness=1.5)
    y -= 18

    # ── Cabecera del recibo ─────────────────────────────────────────
    c.setFont('Helvetica-Bold', 14)
    c.drawString(margin, y, f'RECIBO N.° {recibo.id}')

    # Info recibo (derecha)
    c.setFont('Helvetica', 9)
    c.setFillColorRGB(0.3, 0.3, 0.3)
    fecha_str = recibo.fecha_emision.strftime('%d/%m/%Y %H:%M') if recibo.fecha_emision else 'N/A'
    c.drawRightString(width - margin, y, f'Fecha de emisión: {fecha_str}')
    y -= 14
    estado_upper = recibo.estado.upper()
    c.drawRightString(width - margin, y, f'Estado: {estado_upper}')
    c.setFillColorRGB(0, 0, 0)
    y -= 14
    c.setFont('Helvetica', 9)
    c.drawString(margin, y, f'Orden de trabajo N.° {recibo.orden_trabajo.id}')
    y -= 20
    draw_hline(y)
    y -= 18

    # ── Cliente ─────────────────────────────────────────────────────
    y = section_title('Información del cliente', y)
    y -= 14
    cliente = recibo.orden_trabajo.cliente
    c.setFont('Helvetica-Bold', 9)
    c.drawString(margin, y, f'{cliente.usuario.nombre} {cliente.usuario.apellido}')
    c.setFont('Helvetica', 9)
    c.setFillColorRGB(0.3, 0.3, 0.3)
    c.drawString(margin + 160, y, f'Doc: {cliente.documento}')
    c.drawString(margin + 300, y, f'Tel: {cliente.usuario.telefono or "N/A"}')
    c.setFillColorRGB(0, 0, 0)
    y -= 13
    c.setFont('Helvetica', 9)
    c.setFillColorRGB(0.3, 0.3, 0.3)
    c.drawString(margin, y, f'Correo: {cliente.usuario.email}')
    c.setFillColorRGB(0, 0, 0)
    y -= 18
    draw_hline(y)
    y -= 18

    # ── Vehículo ────────────────────────────────────────────────────
    y = section_title('Información del vehículo', y)
    y -= 14
    vehiculo = recibo.orden_trabajo.vehiculo
    c.setFont('Helvetica-Bold', 9)
    c.drawString(margin, y, f'{vehiculo.marca} {vehiculo.modelo}')
    c.setFont('Helvetica', 9)
    c.setFillColorRGB(0.3, 0.3, 0.3)
    c.drawString(margin + 160, y, f'Año: {vehiculo.anio or "N/A"}')
    c.drawString(margin + 230, y, f'Placa: {vehiculo.placa}')
    c.drawString(margin + 320, y, f'Km: {vehiculo.kilometraje:,}')
    c.setFillColorRGB(0, 0, 0)
    y -= 18
    draw_hline(y)
    y -= 18

    # ── Orden de trabajo ────────────────────────────────────────────
    y = section_title('Información de la orden', y)
    y -= 14
    orden = recibo.orden_trabajo
    c.setFont('Helvetica', 9)
    c.setFillColorRGB(0.3, 0.3, 0.3)
    fecha_ingreso = orden.fecha_ingreso.strftime('%d/%m/%Y') if orden.fecha_ingreso else 'N/A'
    fecha_entrega = orden.fecha_entrega.strftime('%d/%m/%Y') if orden.fecha_entrega else 'Pendiente'
    c.drawString(margin, y, f'Ingreso: {fecha_ingreso}')
    c.drawString(margin + 160, y, f'Entrega: {fecha_entrega}')
    c.drawString(margin + 320, y, f'Estado orden: {orden.estado}')
    y -= 13
    if orden.diagnostico:
        c.drawString(margin, y, f'Diagnóstico: {orden.diagnostico[:90]}')
        y -= 13
    if orden.trabajo_realizado:
        c.drawString(margin, y, f'Trabajo: {orden.trabajo_realizado[:90]}')
        y -= 13
    if orden.observaciones:
        c.drawString(margin, y, f'Observaciones: {orden.observaciones[:90]}')
        y -= 13
    c.setFillColorRGB(0, 0, 0)
    y -= 8
    draw_hline(y)
    y -= 18

    # ── Tabla de servicios ──────────────────────────────────────────
    y = section_title('Servicios realizados', y)
    y -= 14

    # Cabecera de tabla
    col_serv = margin
    col_cant = margin + 230
    col_precio = margin + 295
    col_sub = margin + 370

    c.setFillColorRGB(0.95, 0.95, 0.95)
    c.rect(margin - 2, y - 3, width - 2 * margin + 4, 16, fill=1, stroke=0)
    c.setFillColorRGB(0, 0, 0)
    c.setFont('Helvetica-Bold', 8)
    c.drawString(col_serv, y, 'SERVICIO')
    c.drawString(col_cant, y, 'CANT.')
    c.drawString(col_precio, y, 'PRECIO UNIT.')
    c.drawString(col_sub, y, 'SUBTOTAL')
    y -= 18

    # Filas de servicios — leídas desde la relación real de la orden
    ordenes_servicios = recibo.orden_trabajo.ordenes_servicios
    c.setFont('Helvetica', 9)
    for os_item in ordenes_servicios:
        nombre_serv = (os_item.servicio.nombre if os_item.servicio else 'Servicio')[:45]
        c.drawString(col_serv, y, nombre_serv)
        c.drawString(col_cant, y, str(os_item.cantidad or 1))
        c.drawString(col_precio, y, f'${float(os_item.precio):.2f}')
        c.drawString(col_sub, y, f'${float(os_item.subtotal):.2f}')
        y -= 14
        if y < 120:   # salto de página si no hay espacio
            c.showPage()
            y = height - margin

    if not ordenes_servicios:
        c.setFillColorRGB(0.5, 0.5, 0.5)
        c.drawString(col_serv, y, '(Sin servicios registrados)')
        c.setFillColorRGB(0, 0, 0)
        y -= 14

    y -= 6
    draw_hline(y)
    y -= 18

    # ── Totales ─────────────────────────────────────────────────────
    col_label = width - margin - 140
    col_value = width - margin

    c.setFont('Helvetica', 9)
    c.setFillColorRGB(0.3, 0.3, 0.3)
    c.drawString(col_label, y, 'Subtotal:')
    c.drawRightString(col_value, y, f'${float(recibo.subtotal):.2f}')
    y -= 14
    c.drawString(col_label, y, 'Descuento:')
    c.drawRightString(col_value, y, f'${float(recibo.descuento):.2f}')
    y -= 6
    draw_hline(y)
    y -= 14
    c.setFont('Helvetica-Bold', 11)
    c.setFillColorRGB(0, 0, 0)
    c.drawString(col_label, y, 'TOTAL:')
    c.setFillColorRGB(0.898, 0.098, 0.165)
    c.drawRightString(col_value, y, f'${float(recibo.total):.2f}')
    c.setFillColorRGB(0, 0, 0)
    y -= 22

    # ── Información de pago (si existe) ────────────────────────────
    if recibo.pagos:
        draw_hline(y)
        y -= 14
        y = section_title('Información de pago', y)
        y -= 14
        ultimo_pago = recibo.pagos[-1]
        c.setFont('Helvetica', 9)
        c.setFillColorRGB(0.3, 0.3, 0.3)
        c.drawString(margin, y, f'Método: {ultimo_pago.metodo_pago or "N/A"}')
        c.drawString(margin + 160, y, f'Referencia: {ultimo_pago.referencia or "N/A"}')
        fecha_pago = ultimo_pago.fecha_pago.strftime('%d/%m/%Y') if ultimo_pago.fecha_pago else 'N/A'
        c.drawString(margin + 360, y, f'Fecha: {fecha_pago}')
        c.setFillColorRGB(0, 0, 0)
        y -= 20

    # ── Pie de página ───────────────────────────────────────────────
    draw_hline(60)
    c.setFont('Helvetica', 7)
    c.setFillColorRGB(0.6, 0.6, 0.6)
    c.drawCentredString(width / 2, 48, 'Jenna Car  ·  Taller Automotriz  ·  Documento generado electrónicamente')

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer


@app.get('/api/recibos/mis-recibos')
@jwt_required()
def mis_recibos():
    usuario = request.current_user
    cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
    if not cliente:
        return jsonify({'error': 'El usuario no tiene perfil de cliente'}), 403

    ordenes = OrdenTrabajo.query.filter_by(cliente_id=cliente.id).all()
    hubo_cambios = False
    for orden in ordenes:
        if not orden.recibo:
            asegurar_recibo_orden(orden, do_commit=False)
            hubo_cambios = True
    if hubo_cambios:
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()

    recibos = Recibo.query.filter_by(cliente_id=cliente.id).order_by(Recibo.fecha_emision.desc(), Recibo.id.desc()).all()

    data = []
    for recibo in recibos:
        orden = recibo.orden_trabajo
        vehiculo = orden.vehiculo if orden else None
        data.append({
            'id': recibo.id,
            'orden_trabajo_id': recibo.orden_id,
            'orden_id': recibo.orden_id,
            'fecha_ingreso': orden.fecha_ingreso.isoformat() if orden and orden.fecha_ingreso else recibo.fecha_emision.isoformat(),
            'fecha_emision': recibo.fecha_emision.isoformat() if recibo.fecha_emision else None,
            'vehiculo_id': orden.vehiculo_id if orden else 0,
            'vehiculo': {
                'id': vehiculo.id,
                'marca': vehiculo.marca,
                'modelo': vehiculo.modelo,
                'placa': vehiculo.placa,
            } if vehiculo else None,
            'estado': recibo.estado,
            'subtotal': float(recibo.subtotal),
            'descuento': float(recibo.descuento),
            'total': float(recibo.total),
            'creado_en': recibo.fecha_emision.isoformat() if recibo.fecha_emision else None,
        })

    return jsonify({'data': data})


@app.get('/api/recibos/<int:recibo_id>/pdf')
@jwt_required()
def recibo_pdf(recibo_id):
    usuario = request.current_user

    # 2. Obtener el recibo
    recibo = db.session.get(Recibo, recibo_id)
    if not recibo:
        return jsonify({'error': 'Recibo no encontrado'}), 404

    # 3. Obtener la orden relacionada
    orden = db.session.get(OrdenTrabajo, recibo.orden_id)
    if not orden:
        return jsonify({'error': 'Orden relacionada no encontrada'}), 404

    # 4-5-6. Obtener cliente y vehículo desde la orden (información real de MySQL)
    # 7. Obtener servicios y pago se hace dentro de generar_pdf_recibo via relaciones
    # Validar propiedad del recurso: usuario solo sus propios recibos, admin cualquiera
    if usuario.rol != 'admin':
        cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
        if not cliente or orden.cliente_id != cliente.id:
            return jsonify({'error': 'No tienes permisos para ver este recibo'}), 403

    # 8. Calcular totales ya vienen en recibo.subtotal / descuento / total (persistidos)
    # 9. Generar PDF real con ReportLab
    pdf_buffer = generar_pdf_recibo(recibo)

    # 10. Devolver PDF - inline para ver/imprimir, ?download=1 para descarga
    download = request.args.get('download', '').lower() in {'1', 'true', 'yes'}
    filename = f'recibo-ORDEN-{str(orden.id).zfill(3)}.pdf'
    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=download,
        download_name=filename
    )


def payment_to_dict(payment):
    metodo = (payment.metodo_pago or 'otro').lower()
    nombre_metodo = 'Nequi' if metodo in {'otro', 'nequi', 'transferencia'} else metodo.capitalize()
    orden_id = payment.recibo.orden_id if payment.recibo else None
    recibo_obj = {
        'id': payment.recibo_id,
        'orden_id': orden_id,
        'estado': payment.recibo.estado if payment.recibo else None,
    } if payment.recibo else {'id': payment.recibo_id, 'orden_id': None, 'estado': None}
    return {
        'id': payment.id,
        'recibo_id': payment.recibo_id,
        'orden_id': orden_id,
        'recibo': recibo_obj,
        'orden': {'id': orden_id} if orden_id else None,
        'monto': float(payment.monto),
        'metodo_pago': nombre_metodo,
        'referencia': payment.referencia,
        'estado': payment.estado,
        'fecha_pago': payment.fecha_pago.isoformat() if payment.fecha_pago else None,
        'simulacion': True,
        'mensaje': 'PAGO SIMULADO — NO ES UNA TRANSACCIÓN REAL',
    }


@app.post('/api/pagos')
@jwt_required()
def crear_pago_simulado():
    payload = request.get_json(silent=True) or {}
    recibo_id = payload.get('recibo_id')
    numero_nequi = str(payload.get('numero_nequi') or '').strip()

    if not recibo_id:
        return jsonify({'error': 'El recibo es obligatorio'}), 400
    if not re.fullmatch(r'3\d{9}', numero_nequi):
        return jsonify({'error': 'Ingresa un número de Nequi válido de 10 dígitos'}), 400

    usuario = request.current_user
    cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
    if not cliente:
        return jsonify({'error': 'No tienes un perfil de cliente asociado'}), 403

    recibo = Recibo.query.filter_by(id=recibo_id, cliente_id=cliente.id).first()
    if not recibo:
        return jsonify({'error': 'Recibo no encontrado'}), 404
    if recibo.estado == 'pagado':
        return jsonify({'error': 'Este recibo ya fue pagado'}), 409

    referencia = f'NEQUI-{secrets.token_hex(8).upper()}'
    numero_nequi_masked = numero_nequi[-4:] if len(numero_nequi) >= 4 else numero_nequi
    pago = Pago(
        recibo_id=recibo.id,
        usuario_id=usuario.id,
        monto=recibo.total,
        metodo_pago='nequi',
        numero_nequi=numero_nequi_masked,
        fecha_pago=datetime.now(timezone.utc),
        referencia=referencia,
        estado='completado',
    )

    recibo.estado = 'pagado'
    db.session.add(pago)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Conflicto al registrar el pago. Inténtalo de nuevo.'}), 409

    notificacion_por_usuario(
        usuario_id=usuario.id,
        titulo='Pago registrado',
        mensaje=f'El pago de ${float(recibo.total):.2f} ha sido registrado correctamente. Referencia: {referencia}.',
        tipo='pago',
        link=f'/recibos/{recibo.orden_trabajo.id if recibo.orden_trabajo else recibo.id}',
    )

    response = payment_to_dict(pago)
    response['mensaje'] = 'Pago simulado registrado correctamente. PAGO SIMULADO — NO ES UNA TRANSACCIÓN REAL'
    return jsonify({'data': response}), 201


@app.get('/api/pagos/<int:pago_id>')
@jwt_required()
def detalle_pago_usuario(pago_id: int):
    usuario = request.current_user
    cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
    if not cliente:
        return jsonify({'error': 'No tienes un perfil de cliente asociado'}), 403

    pago = Pago.query.join(Recibo).filter(Pago.id == pago_id, Recibo.cliente_id == cliente.id).first()
    if not pago:
        return jsonify({'error': 'Pago no encontrado'}), 404

    return jsonify({'data': payment_to_dict(pago)})


@app.get('/api/pagos/mis-pagos')
@jwt_required()
def mis_pagos():
    usuario = request.current_user
    cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
    if not cliente:
        return jsonify({'error': 'No tienes un perfil de cliente asociado'}), 403

    pagos = Pago.query.join(Recibo).filter(Recibo.cliente_id == cliente.id).order_by(Pago.fecha_pago.desc(), Pago.id.desc()).all()
    return jsonify({'data': [payment_to_dict(pago) for pago in pagos]})


@app.get('/api/admin/pagos')
@jwt_required(roles=['admin'])
def admin_pagos():
    query = request.args.get('q', '').strip()
    referencia = request.args.get('referencia', '').strip()
    cliente = request.args.get('cliente', '').strip()
    estado = request.args.get('estado', '').strip()
    fecha = request.args.get('fecha', '').strip()

    pagos_query = Pago.query.join(Recibo).join(OrdenTrabajo).join(Cliente).join(Usuario)

    if query:
        pagos_query = pagos_query.filter(
            (Pago.referencia.ilike(f'%{query}%')) |
            (Usuario.nombre.ilike(f'%{query}%')) |
            (Usuario.apellido.ilike(f'%{query}%')) |
            (Usuario.email.ilike(f'%{query}%'))
        )
    if referencia:
        pagos_query = pagos_query.filter(Pago.referencia.ilike(f'%{referencia}%'))
    if cliente:
        pagos_query = pagos_query.filter(
            (Usuario.nombre.ilike(f'%{cliente}%')) |
            (Usuario.apellido.ilike(f'%{cliente}%')) |
            (Usuario.email.ilike(f'%{cliente}%'))
        )
    if estado:
        pagos_query = pagos_query.filter(Pago.estado.ilike(f'%{estado}%'))
    if fecha:
        pagos_query = pagos_query.filter(db.func.date(Pago.fecha_pago) == fecha)

    pagos = pagos_query.order_by(Pago.fecha_pago.desc(), Pago.id.desc()).all()
    return jsonify({'data': [payment_to_dict(pago) for pago in pagos]})


@app.get('/api/admin/pagos/<int:pago_id>')
@jwt_required(roles=['admin'])
def admin_pago_detalle(pago_id: int):
    pago = db.session.get(Pago, pago_id)
    if not pago:
        return jsonify({'error': 'Pago no encontrado'}), 404
    return jsonify({'data': payment_to_dict(pago)})


@app.get('/api/admin/usuarios')
@jwt_required(roles=['admin'])
def admin_usuarios():
    usuarios = Usuario.query.order_by(Usuario.created_at.desc()).all()
    return jsonify({
        'data': [
            {
                'id': usuario.id,
                'nombre': usuario.nombre,
                'apellido': usuario.apellido,
                'email': usuario.email,
                'telefono': usuario.telefono,
                'rol': usuario.rol,
                'estado': usuario.estado,
                'foto_perfil': usuario.foto_perfil,
                'created_at': usuario.created_at.isoformat() if usuario.created_at else None,
            }
            for usuario in usuarios
        ]
    })


@app.put('/api/admin/usuarios/<int:usuario_id>/rol')
@jwt_required(roles=['admin'])
def cambiar_rol_usuario(usuario_id: int):
    payload = request.get_json(silent=True) or {}
    nuevo_rol = payload.get('rol')
    
    if nuevo_rol not in ['usuario', 'admin']:
        return jsonify({'error': 'Rol inválido. Debe ser "usuario" o "admin"'}), 400
    
    usuario = db.session.get(Usuario, usuario_id)
    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    
    # Protección del último admin
    admin_count = db.session.query(db.func.count(Usuario.id)).filter(Usuario.rol == 'admin').scalar() or 0
    
    # Si se intenta quitar el rol admin al último admin, denegar
    if usuario.rol == 'admin' and nuevo_rol != 'admin' and admin_count <= 1:
        return jsonify({'error': 'No se puede quitar el rol de administrador al último administrador existente.'}), 400
    
    usuario.rol = nuevo_rol
    db.session.commit()
    return jsonify({'user': usuario.to_public_dict()})


def cita_to_dict(cita):
    return {
        'id': cita.id,
        'cliente_id': cita.cliente_id,
        'vehiculo_id': cita.vehiculo_id,
        'servicio_id': cita.servicio_id,
        'cliente': {
            'id': cita.cliente.id,
            'nombre': cita.cliente.usuario.nombre,
            'apellido': cita.cliente.usuario.apellido,
        } if cita.cliente and cita.cliente.usuario else None,
        'vehiculo': {
            'id': cita.vehiculo.id,
            'marca': cita.vehiculo.marca,
            'modelo': cita.vehiculo.modelo,
            'placa': cita.vehiculo.placa,
        } if cita.vehiculo else None,
        'servicio': {
            'id': cita.servicio.id,
            'name': cita.servicio.nombre,
        } if cita.servicio else None,
        'fecha': str(cita.fecha),
        'hora': str(cita.hora),
        'motivo': cita.motivo,
        'observaciones': cita.observaciones,
        'estado': cita.estado,
        'created_at': cita.created_at.isoformat() if cita.created_at else None,
        'updated_at': cita.updated_at.isoformat() if cita.updated_at else None,
    }


@app.get('/api/admin/citas')
@jwt_required(roles=['admin'])
def admin_citas():
    query = (request.args.get('q', '') or '').strip()
    cliente = (request.args.get('cliente', '') or '').strip()
    vehiculo = (request.args.get('vehiculo', '') or '').strip()
    fecha = (request.args.get('fecha', '') or '').strip()
    estado = (request.args.get('estado', '') or '').strip()

    if fecha:
        try:
            datetime.strptime(fecha, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'La fecha debe tener formato YYYY-MM-DD'}), 400

    if estado and estado not in ['pendiente', 'confirmada', 'atendida', 'cancelada']:
        return jsonify({'error': 'Estado inválido'}), 400

    citas = Cita.query.order_by(Cita.fecha.desc(), Cita.hora.desc()).all()
    resultado = []

    for cita in citas:
        cliente_obj = cita.cliente and cita.cliente.usuario
        vehiculo_obj = cita.vehiculo
        servicio_obj = cita.servicio

        if query:
            haystack = ' '.join([
                (cliente_obj.nombre if cliente_obj and cliente_obj.nombre else ''),
                (cliente_obj.apellido if cliente_obj and cliente_obj.apellido else ''),
                (cliente_obj.email if cliente_obj and cliente_obj.email else ''),
                (vehiculo_obj.placa if vehiculo_obj and vehiculo_obj.placa else ''),
                (vehiculo_obj.marca if vehiculo_obj and vehiculo_obj.marca else ''),
                (vehiculo_obj.modelo if vehiculo_obj and vehiculo_obj.modelo else ''),
                (servicio_obj.nombre if servicio_obj and servicio_obj.nombre else ''),
                cita.estado or '',
                str(cita.fecha),
                str(cita.hora),
            ]).lower()
            if query.lower() not in haystack:
                continue

        if cliente:
            nombre_cliente = f"{cliente_obj.nombre if cliente_obj and cliente_obj.nombre else ''} {cliente_obj.apellido if cliente_obj and cliente_obj.apellido else ''}".strip().lower()
            email_cliente = (cliente_obj.email if cliente_obj and cliente_obj.email else '').lower()
            if cliente.lower() not in nombre_cliente and cliente.lower() not in email_cliente:
                continue

        if vehiculo:
            haystack_vehiculo = ' '.join([
                (vehiculo_obj.placa if vehiculo_obj and vehiculo_obj.placa else ''),
                (vehiculo_obj.marca if vehiculo_obj and vehiculo_obj.marca else ''),
                (vehiculo_obj.modelo if vehiculo_obj and vehiculo_obj.modelo else ''),
            ]).lower()
            if vehiculo.lower() not in haystack_vehiculo:
                continue

        if fecha and str(cita.fecha) != fecha:
            continue

        if estado and cita.estado != estado:
            continue

        resultado.append(cita)

    return jsonify({'data': [cita_to_dict(cita) for cita in resultado]})


@app.get('/api/admin/citas/<int:cita_id>')
@jwt_required(roles=['admin'])
def admin_cita_detalle(cita_id: int):
    cita = db.session.get(Cita, cita_id)
    if not cita:
        return jsonify({'error': 'Cita no encontrada'}), 404
    return jsonify({'data': cita_to_dict(cita)})


@app.post('/api/admin/citas')
@jwt_required(roles=['admin'])
def crear_cita_admin():
    payload = request.get_json(silent=True) or {}
    cliente_id = payload.get('cliente_id')
    vehiculo_id = payload.get('vehiculo_id')
    servicio_id = payload.get('servicio_id')
    fecha = payload.get('fecha')
    hora = payload.get('hora')
    motivo = (payload.get('motivo') or '').strip() or None
    observaciones = (payload.get('observaciones') or '').strip() or None
    estado = (payload.get('estado') or 'pendiente').strip()

    if not cliente_id:
        return jsonify({'error': 'El cliente es obligatorio'}), 400
    if not vehiculo_id:
        return jsonify({'error': 'El vehículo es obligatorio'}), 400
    if not servicio_id:
        return jsonify({'error': 'El servicio es obligatorio'}), 400
    if not fecha:
        return jsonify({'error': 'La fecha es obligatoria'}), 400
    if not hora:
        return jsonify({'error': 'La hora es obligatoria'}), 400

    cliente = db.session.get(Cliente, cliente_id)
    if not cliente:
        return jsonify({'error': 'Cliente no encontrado'}), 404

    vehiculo = db.session.get(Vehiculo, vehiculo_id)
    if not vehiculo:
        return jsonify({'error': 'Vehículo no encontrado'}), 404
    if vehiculo.cliente_id != cliente.id:
        return jsonify({'error': 'El vehículo no pertenece al cliente indicado'}), 400

    servicio = db.session.get(Servicio, servicio_id)
    if not servicio:
        return jsonify({'error': 'Servicio no encontrado'}), 404

    estados_validos = ['pendiente', 'confirmada', 'atendida', 'cancelada']
    if estado not in estados_validos:
        return jsonify({'error': 'Estado inválido'}), 400

    try:
        fecha_obj = datetime.strptime(str(fecha), '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'La fecha debe tener formato YYYY-MM-DD'}), 400

    try:
        hora_obj = validar_hora_cita(hora)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    lock_name = f'jenna_car:cita:{fecha_obj}:{hora_obj}'
    if db.engine.name != 'sqlite':
        connection = db.engine.connect()
        try:
            try:
                connection.execute(text('SELECT GET_LOCK(:lock_name, 10)'), {'lock_name': lock_name})
                connection.commit()
            except Exception:
                pass

            existing = Cita.query.filter(
                Cita.fecha == fecha_obj,
                Cita.hora == hora_obj,
                Cita.estado != 'cancelada'
            ).first()
            if existing:
                return jsonify({'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'}), 409

            cita = Cita(
                cliente_id=cliente.id,
                vehiculo_id=vehiculo.id,
                servicio_id=servicio.id,
                fecha=fecha_obj,
                hora=hora_obj,
                motivo=motivo,
                observaciones=observaciones,
                estado=estado,
            )
            db.session.add(cita)
            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                return jsonify({'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'}), 409
        finally:
            try:
                connection.execute(text('SELECT RELEASE_LOCK(:lock_name)'), {'lock_name': lock_name})
                connection.commit()
            except Exception:
                pass
            connection.close()
    else:
        existing = Cita.query.filter(
            Cita.fecha == fecha_obj,
            Cita.hora == hora_obj,
            Cita.estado != 'cancelada'
        ).first()
        if existing:
            return jsonify({'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'}), 409

        cita = Cita(
            cliente_id=cliente.id,
            vehiculo_id=vehiculo.id,
            servicio_id=servicio.id,
            fecha=fecha_obj,
            hora=hora_obj,
            motivo=motivo,
            observaciones=observaciones,
            estado=estado,
        )
        db.session.add(cita)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'}), 409

    return jsonify({'data': cita_to_dict(cita)}), 201


@app.put('/api/admin/citas/<int:cita_id>')
@jwt_required(roles=['admin'])
def actualizar_cita_admin(cita_id: int):
    cita = db.session.get(Cita, cita_id)
    if not cita:
        return jsonify({'error': 'Cita no encontrada'}), 404

    payload = request.get_json(silent=True) or {}

    if 'cliente_id' in payload:
        cliente_id = payload.get('cliente_id')
        if not cliente_id:
            return jsonify({'error': 'El cliente es obligatorio'}), 400
        cliente = db.session.get(Cliente, cliente_id)
        if not cliente:
            return jsonify({'error': 'Cliente no encontrado'}), 404
        cita.cliente_id = cliente.id

    if 'vehiculo_id' in payload:
        vehiculo_id = payload.get('vehiculo_id')
        if not vehiculo_id:
            return jsonify({'error': 'El vehículo es obligatorio'}), 400
        vehiculo = db.session.get(Vehiculo, vehiculo_id)
        if not vehiculo:
            return jsonify({'error': 'Vehículo no encontrado'}), 404
        if vehiculo.cliente_id != cita.cliente_id:
            return jsonify({'error': 'El vehículo no pertenece al cliente indicado'}), 400
        cita.vehiculo_id = vehiculo.id

    if 'servicio_id' in payload:
        servicio_id = payload.get('servicio_id')
        if not servicio_id:
            return jsonify({'error': 'El servicio es obligatorio'}), 400
        servicio = db.session.get(Servicio, servicio_id)
        if not servicio:
            return jsonify({'error': 'Servicio no encontrado'}), 404
        cita.servicio_id = servicio.id

    if 'fecha' in payload:
        fecha = payload.get('fecha')
        if not fecha:
            return jsonify({'error': 'La fecha es obligatoria'}), 400
        try:
            cita.fecha = datetime.strptime(str(fecha), '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'La fecha debe tener formato YYYY-MM-DD'}), 400

    if 'hora' in payload:
        hora = payload.get('hora')
        if not hora:
            return jsonify({'error': 'La hora es obligatoria'}), 400
        try:
            cita.hora = validar_hora_cita(hora)
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400

    if 'motivo' in payload:
        cita.motivo = (payload.get('motivo') or '').strip() or None

    if 'observaciones' in payload:
        cita.observaciones = (payload.get('observaciones') or '').strip() or None

    if 'estado' in payload:
        estado = (payload.get('estado') or cita.estado).strip()
        estados_validos = ['pendiente', 'confirmada', 'atendida', 'cancelada']
        if estado not in estados_validos:
            return jsonify({'error': 'Estado inválido'}), 400
        cita.estado = estado

    lock_name = f'jenna_car:cita:{cita.fecha}:{cita.hora}'
    if db.engine.name != 'sqlite':
        connection = db.engine.connect()
        try:
            try:
                connection.execute(text('SELECT GET_LOCK(:lock_name, 10)'), {'lock_name': lock_name})
                connection.commit()
            except Exception:
                pass

            duplicate = Cita.query.filter(
                Cita.id != cita.id,
                Cita.fecha == cita.fecha,
                Cita.hora == cita.hora,
                Cita.estado != 'cancelada'
            ).first()
            if duplicate:
                return jsonify({'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'}), 409

            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                return jsonify({'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'}), 409
        finally:
            try:
                connection.execute(text('SELECT RELEASE_LOCK(:lock_name)'), {'lock_name': lock_name})
                connection.commit()
            except Exception:
                pass
            connection.close()
    else:
        duplicate = Cita.query.filter(
            Cita.id != cita.id,
            Cita.fecha == cita.fecha,
            Cita.hora == cita.hora,
            Cita.estado != 'cancelada'
        ).first()
        if duplicate:
            return jsonify({'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'}), 409

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({'error': 'La fecha y hora seleccionadas ya están ocupadas. Selecciona otro horario.'}), 409

    return jsonify({'data': cita_to_dict(cita)})


@app.delete('/api/admin/citas/<int:cita_id>')
@jwt_required(roles=['admin'])
def eliminar_cita_admin(cita_id: int):
    cita = db.session.get(Cita, cita_id)
    if not cita:
        return jsonify({'error': 'Cita no encontrada'}), 404

    db.session.delete(cita)
    db.session.commit()
    return jsonify({'message': 'Cita eliminada correctamente.'})


@app.put('/api/admin/citas/<int:cita_id>/estado')
@jwt_required(roles=['admin'])
def actualizar_estado_cita(cita_id: int):
    payload = request.get_json(silent=True) or {}
    nuevo_estado = payload.get('estado')

    estados_validos = ['pendiente', 'confirmada', 'atendida', 'cancelada']
    if nuevo_estado not in estados_validos:
        return jsonify({'error': 'Estado inválido'}), 400

    cita = db.session.get(Cita, cita_id)
    if not cita:
        return jsonify({'error': 'Cita no encontrada'}), 404

    cita.estado = nuevo_estado
    db.session.commit()
    return jsonify({'data': {'id': cita.id, 'estado': cita.estado}})


@app.get('/api/admin/search')
@jwt_required(roles=['admin'])
def admin_search():
    '''Búsqueda avanzada en el panel administrativo'''
    query = request.args.get('q', '')
    type_filter = request.args.get('type', '')  # cliente, vehiculo, orden, cita, recibo
    
    results = {}
    
    if type_filter == 'cliente' or not type_filter:
        # Search clients by name, document, or email
        clients = Cliente.query.join(Usuario).filter(
            (Usuario.nombre.ilike(f'%{query}%')) |
            (Cliente.documento.ilike(f'%{query}%')) |
            (Usuario.email.ilike(f'%{query}%'))
        ).all()
        results['clientes'] = [
            {
                'id': c.id,
                'nombre': c.usuario.nombre,
                'apellido': c.usuario.apellido,
                'documento': c.documento,
                'email': c.usuario.email,
                'telefono': c.usuario.telefono,
            }
            for c in clients
        ]
    
    if type_filter == 'vehiculo' or not type_filter:
        # Search vehicles by plate, brand, or model
        vehicles = Vehiculo.query.filter(
            (Vehiculo.placa.ilike(f'%{query}%')) |
            (Vehiculo.marca.ilike(f'%{query}%')) |
            (Vehiculo.modelo.ilike(f'%{query}%'))
        ).all()
        results['vehiculos'] = [
            {
                'id': v.id,
                'placa': v.placa,
                'marca': v.marca,
                'modelo': v.modelo,
                'anio': v.anio,
                'cliente_id': v.cliente_id,
            }
            for v in vehicles
        ]
    
    if type_filter == 'orden' or not type_filter:
        # Search work orders by number, plate, client, or status
        orders = OrdenTrabajo.query.join(OrdenTrabajo.cliente).join(Cliente.usuario).join(OrdenTrabajo.vehiculo).filter(
            (OrdenTrabajo.id.cast(String).ilike(f'%{query}%')) |
            (Vehiculo.placa.ilike(f'%{query}%')) |
            (Usuario.nombre.ilike(f'%{query}%')) |
            (OrdenTrabajo.estado.ilike(f'%{query}%'))
        ).all()
        results['órdenes'] = [
            {
                'id': o.id,
                'cliente': f"{o.cliente.usuario.nombre} {o.cliente.usuario.apellido}",
                'vehiculo_placa': o.vehiculo.placa,
                'estado': o.estado,
            }
            for o in orders
        ]
    
    if type_filter == 'cita' or not type_filter:
        # Search appointments by date, client, or status
        cita_query = Cita.query.join(Cliente).join(Usuario)
        if query:
            try:
                # Try to parse as date
                from datetime import datetime
                parsed_date = datetime.strptime(query, '%Y-%m-%d').date()
                cita_query = cita_query.filter(Cita.fecha == parsed_date)
            except ValueError:
                pass
            cita_query = cita_query.filter(
                (Usuario.nombre.ilike(f'%{query}%')) |
                (Cita.estado.ilike(f'%{query}%'))
            )
        else:
            cita_query = cita_query.filter(
                (Usuario.nombre.ilike(f'%{query}%')) |
                (Cita.estado.ilike(f'%{query}%'))
            )
        
        citas = cita_query.all()
        results['citas'] = [
            {
                'id': c.id,
                'cliente': f"{c.cliente.usuario.nombre} {c.cliente.usuario.apellido}",
                'vehiculo_placa': c.vehiculo.placa,
                'fecha': str(c.fecha),
                'hora': str(c.hora),
                'estado': c.estado,
            }
            for c in citas
        ]
    
    if type_filter == 'recibo' or not type_filter:
        # Search receipts by number, client, or status
        recibo_query = Recibo.query.join(OrdenTrabajo).join(Cliente).join(Usuario)
        recibo_query = recibo_query.filter(
            (OrdenTrabajo.id.cast(String).ilike(f'%{query}%')) |
            (Usuario.nombre.ilike(f'%{query}%')) |
            (Recibo.estado.ilike(f'%{query}%'))
        )
        recibos = recibo_query.all()
        results['recibos'] = [
            {
                'id': r.id,
                'orden_id': r.orden_id,
                'cliente': f"{r.orden_trabajo.cliente.usuario.nombre} {r.orden_trabajo.cliente.usuario.apellido}",
                'estado': r.estado,
                'fecha_emision': r.fecha_emision.isoformat() if r.fecha_emision else None,
            }
            for r in recibos
        ]
    
    return jsonify({'data': results})


def vehicle_to_dict(vehicle):
    cliente = vehicle.cliente
    cliente_data = None
    if cliente and cliente.usuario:
        cliente_data = {
            'id': cliente.id,
            'nombre': cliente.usuario.nombre,
            'apellido': cliente.usuario.apellido,
            'email': cliente.usuario.email,
        }

    return {
        'id': vehicle.id,
        'cliente_id': vehicle.cliente_id,
        'cliente': cliente_data,
        'placa': vehicle.placa,
        'marca': vehicle.marca,
        'modelo': vehicle.modelo,
        'anio': vehicle.anio,
        'color': vehicle.color,
        'kilometraje': vehicle.kilometraje,
        'tipo_combustible': vehicle.tipo_combustible,
        'estado': vehicle.estado,
        'created_at': vehicle.created_at.isoformat() if vehicle.created_at else None,
        'updated_at': vehicle.updated_at.isoformat() if vehicle.updated_at else None,
    }


@app.get('/api/admin/vehiculos')
@jwt_required(roles=['admin'])
def admin_vehiculos():
    query = request.args.get('q', '').strip()
    base_query = Vehiculo.query.join(Cliente).join(Usuario)

    if query:
        base_query = base_query.filter(
            (Vehiculo.placa.ilike(f'%{query}%')) |
            (Vehiculo.marca.ilike(f'%{query}%')) |
            (Vehiculo.modelo.ilike(f'%{query}%')) |
            (Usuario.nombre.ilike(f'%{query}%')) |
            (Usuario.apellido.ilike(f'%{query}%'))
        )

    vehicles = base_query.order_by(Vehiculo.id.desc()).all()
    return jsonify({'data': [vehicle_to_dict(vehicle) for vehicle in vehicles]})


@app.get('/api/admin/vehiculos/<int:vehiculo_id>')
@jwt_required(roles=['admin'])
def admin_vehiculo_detalle(vehiculo_id: int):
    vehicle = db.session.get(Vehiculo, vehiculo_id)
    if not vehicle:
        return jsonify({'error': 'Vehículo no encontrado'}), 404
    return jsonify({'data': vehicle_to_dict(vehicle)})


@app.post('/api/admin/vehiculos')
@jwt_required(roles=['admin'])
def crear_vehiculo_admin():
    payload = request.get_json(silent=True) or {}
    cliente_id = payload.get('cliente_id')
    try:
        placa = validar_placa(payload.get('placa'))
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    marca = (payload.get('marca') or '').strip()
    modelo = (payload.get('modelo') or '').strip()
    anio = payload.get('anio')
    color = (payload.get('color') or '').strip() or None
    kilometraje = payload.get('kilometraje', 0)
    tipo_combustible = (payload.get('tipo_combustible') or 'gasolina').strip()
    estado = (payload.get('estado') or 'activo').strip()

    if not cliente_id:
        return jsonify({'error': 'El cliente es obligatorio'}), 400
    if not placa:
        return jsonify({'error': 'La placa es obligatoria'}), 400
    if not marca:
        return jsonify({'error': 'La marca es obligatoria'}), 400
    if not modelo:
        return jsonify({'error': 'El modelo es obligatorio'}), 400

    cliente = db.session.get(Cliente, cliente_id)
    if not cliente:
        return jsonify({'error': 'Cliente no encontrado'}), 404

    try:
        kilometraje_int = int(kilometraje)
    except (TypeError, ValueError):
        return jsonify({'error': 'El kilometraje debe ser un número válido'}), 400

    if kilometraje_int < 0:
        return jsonify({'error': 'El kilometraje no puede ser negativo'}), 400

    placa_normalizada = placa.upper()
    if Vehiculo.query.filter_by(placa=placa_normalizada).first():
        return jsonify({'error': 'Ya existe un vehículo con esa placa'}), 409

    valid_fuels = {'gasolina', 'diesel', 'hibrido', 'electrico', 'gas'}
    if tipo_combustible not in valid_fuels:
        return jsonify({'error': 'Tipo de combustible inválido'}), 400

    valid_states = {'activo', 'en_mantenimiento', 'inactivo'}
    if estado not in valid_states:
        return jsonify({'error': 'Estado inválido'}), 400

    if anio is not None:
        try:
            anio_int = int(anio)
        except (TypeError, ValueError):
            return jsonify({'error': 'El año debe ser un número válido'}), 400
        if anio_int < 1900 or anio_int > 2100:
            return jsonify({'error': 'El año no es válido'}), 400
    else:
        anio_int = None

    vehicle = Vehiculo(
        cliente_id=cliente.id,
        placa=placa_normalizada,
        marca=marca,
        modelo=modelo,
        anio=anio_int,
        color=color,
        kilometraje=kilometraje_int,
        tipo_combustible=tipo_combustible,
        estado=estado,
    )
    db.session.add(vehicle)
    db.session.commit()
    return jsonify({'data': vehicle_to_dict(vehicle)}), 201


@app.put('/api/admin/vehiculos/<int:vehiculo_id>')
@jwt_required(roles=['admin'])
def actualizar_vehiculo_admin(vehiculo_id: int):
    vehicle = db.session.get(Vehiculo, vehiculo_id)
    if not vehicle:
        return jsonify({'error': 'Vehículo no encontrado'}), 404

    payload = request.get_json(silent=True) or {}

    if 'cliente_id' in payload:
        cliente_id = payload.get('cliente_id')
        if not cliente_id:
            return jsonify({'error': 'El cliente es obligatorio'}), 400
        cliente = db.session.get(Cliente, cliente_id)
        if not cliente:
            return jsonify({'error': 'Cliente no encontrado'}), 404
        vehicle.cliente_id = cliente.id

    if 'placa' in payload:
        try:
            placa_normalizada = validar_placa(payload.get('placa'))
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400
        duplicate = Vehiculo.query.filter(Vehiculo.id != vehicle.id, Vehiculo.placa == placa_normalizada).first()
        if duplicate:
            return jsonify({'error': 'Ya existe un vehículo con esa placa'}), 409
        vehicle.placa = placa_normalizada

    if 'marca' in payload:
        marca = (payload.get('marca') or '').strip()
        if not marca:
            return jsonify({'error': 'La marca es obligatoria'}), 400
        vehicle.marca = marca

    if 'modelo' in payload:
        modelo = (payload.get('modelo') or '').strip()
        if not modelo:
            return jsonify({'error': 'El modelo es obligatorio'}), 400
        vehicle.modelo = modelo

    if 'anio' in payload:
        anio = payload.get('anio')
        if anio is not None and anio != '':
            try:
                anio_int = int(anio)
            except (TypeError, ValueError):
                return jsonify({'error': 'El año debe ser un número válido'}), 400
            if anio_int < 1900 or anio_int > 2100:
                return jsonify({'error': 'El año no es válido'}), 400
            vehicle.anio = anio_int
        else:
            vehicle.anio = None

    if 'color' in payload:
        vehicle.color = (payload.get('color') or '').strip() or None

    if 'kilometraje' in payload:
        try:
            kilometraje_int = int(payload.get('kilometraje'))
        except (TypeError, ValueError):
            return jsonify({'error': 'El kilometraje debe ser un número válido'}), 400
        if kilometraje_int < 0:
            return jsonify({'error': 'El kilometraje no puede ser negativo'}), 400
        vehicle.kilometraje = kilometraje_int

    if 'tipo_combustible' in payload:
        tipo_combustible = (payload.get('tipo_combustible') or 'gasolina').strip()
        valid_fuels = {'gasolina', 'diesel', 'hibrido', 'electrico', 'gas'}
        if tipo_combustible not in valid_fuels:
            return jsonify({'error': 'Tipo de combustible inválido'}), 400
        vehicle.tipo_combustible = tipo_combustible

    if 'estado' in payload:
        estado = (payload.get('estado') or 'activo').strip()
        valid_states = {'activo', 'en_mantenimiento', 'inactivo'}
        if estado not in valid_states:
            return jsonify({'error': 'Estado inválido'}), 400
        vehicle.estado = estado

    db.session.commit()
    return jsonify({'data': vehicle_to_dict(vehicle)})


@app.delete('/api/admin/vehiculos/<int:vehiculo_id>')
@jwt_required(roles=['admin'])
def eliminar_vehiculo_admin(vehiculo_id: int):
    vehicle = db.session.get(Vehiculo, vehiculo_id)
    if not vehicle:
        return jsonify({'error': 'Vehículo no encontrado'}), 404

    related_cita = db.session.query(Cita.id).filter_by(vehiculo_id=vehicle.id).first()
    related_order = db.session.query(OrdenTrabajo.id).filter_by(vehiculo_id=vehicle.id).first()

    if related_cita or related_order:
        if vehicle.estado != 'inactivo':
            vehicle.estado = 'inactivo'
            db.session.commit()
        return jsonify({
            'data': vehicle_to_dict(vehicle),
            'message': 'Vehículo desactivado porque tiene relaciones existentes.'
        })

    db.session.delete(vehicle)
    db.session.commit()
    return jsonify({'message': 'Vehículo eliminado correctamente.'})


def service_to_dict(service):
    return {
        'id': service.id,
        'nombre': service.nombre,
        'descripcion': service.descripcion,
        'precio': float(service.precio),
        'duracion_estimada': service.duracion_estimada,
        'estado': service.estado,
        'created_at': service.created_at.isoformat() if service.created_at else None,
        'updated_at': service.updated_at.isoformat() if service.updated_at else None,
    }


@app.get('/api/admin/servicios')
@jwt_required(roles=['admin'])
def admin_servicios():
    query = request.args.get('q', '').strip()
    estado = request.args.get('estado', '').strip()
    base_query = Servicio.query

    if query:
        base_query = base_query.filter(
            (Servicio.nombre.ilike(f'%{query}%')) |
            (Servicio.descripcion.ilike(f'%{query}%'))
        )
    if estado:
        base_query = base_query.filter(Servicio.estado == estado)

    services = base_query.order_by(Servicio.id.desc()).all()
    return jsonify({'data': [service_to_dict(service) for service in services]})


@app.get('/api/admin/servicios/<int:servicio_id>')
@jwt_required(roles=['admin'])
def admin_servicio_detalle(servicio_id: int):
    service = db.session.get(Servicio, servicio_id)
    if not service:
        return jsonify({'error': 'Servicio no encontrado'}), 404
    return jsonify({'data': service_to_dict(service)})


@app.post('/api/admin/servicios')
@jwt_required(roles=['admin'])
def crear_servicio_admin():
    payload = request.get_json(silent=True) or {}
    nombre = (payload.get('nombre') or '').strip()
    descripcion = (payload.get('descripcion') or '').strip() or None
    precio = payload.get('precio')
    duracion_estimada = payload.get('duracion_estimada')
    estado = (payload.get('estado') or 'activo').strip()

    if not nombre:
        return jsonify({'error': 'El nombre es obligatorio'}), 400
    if not precio and precio != 0:
        return jsonify({'error': 'El precio es obligatorio'}), 400
    if duracion_estimada is None:
        return jsonify({'error': 'La duración estimada es obligatoria'}), 400

    try:
        precio_decimal = Decimal(str(precio))
    except Exception:
        return jsonify({'error': 'El precio debe ser un número válido'}), 400

    if precio_decimal < 0:
        return jsonify({'error': 'El precio no puede ser negativo'}), 400

    try:
        duracion_int = int(duracion_estimada)
    except (TypeError, ValueError):
        return jsonify({'error': 'La duración estimada debe ser un número válido'}), 400
    if duracion_int < 0:
        return jsonify({'error': 'La duración estimada no puede ser negativa'}), 400

    valid_states = {'activo', 'inactivo'}
    if estado not in valid_states:
        return jsonify({'error': 'Estado inválido'}), 400

    normalized_name = nombre.strip()
    existing = Servicio.query.filter(Servicio.nombre.ilike(normalized_name)).first()
    if existing:
        return jsonify({'error': 'Ya existe un servicio con ese nombre'}), 409

    service = Servicio(
        nombre=normalized_name,
        descripcion=descripcion,
        precio=precio_decimal,
        duracion_estimada=duracion_int,
        estado=estado,
    )
    db.session.add(service)
    db.session.commit()
    return jsonify({'data': service_to_dict(service)}), 201


@app.put('/api/admin/servicios/<int:servicio_id>')
@jwt_required(roles=['admin'])
def actualizar_servicio_admin(servicio_id: int):
    service = db.session.get(Servicio, servicio_id)
    if not service:
        return jsonify({'error': 'Servicio no encontrado'}), 404

    payload = request.get_json(silent=True) or {}

    if 'nombre' in payload:
        nombre = (payload.get('nombre') or '').strip()
        if not nombre:
            return jsonify({'error': 'El nombre es obligatorio'}), 400
        duplicate = Servicio.query.filter(Servicio.id != service.id, Servicio.nombre.ilike(nombre)).first()
        if duplicate:
            return jsonify({'error': 'Ya existe un servicio con ese nombre'}), 409
        service.nombre = nombre

    if 'descripcion' in payload:
        service.descripcion = (payload.get('descripcion') or '').strip() or None

    if 'precio' in payload:
        precio = payload.get('precio')
        if precio is None or precio == '':
            return jsonify({'error': 'El precio es obligatorio'}), 400
        try:
            precio_decimal = Decimal(str(precio))
        except Exception:
            return jsonify({'error': 'El precio debe ser un número válido'}), 400
        if precio_decimal < 0:
            return jsonify({'error': 'El precio no puede ser negativo'}), 400
        service.precio = precio_decimal

    if 'duracion_estimada' in payload:
        duracion = payload.get('duracion_estimada')
        if duracion is None or duracion == '':
            return jsonify({'error': 'La duración estimada es obligatoria'}), 400
        try:
            duracion_int = int(duracion)
        except (TypeError, ValueError):
            return jsonify({'error': 'La duración estimada debe ser un número válido'}), 400
        if duracion_int < 0:
            return jsonify({'error': 'La duración estimada no puede ser negativa'}), 400
        service.duracion_estimada = duracion_int

    if 'estado' in payload:
        estado = (payload.get('estado') or 'activo').strip()
        valid_states = {'activo', 'inactivo'}
        if estado not in valid_states:
            return jsonify({'error': 'Estado inválido'}), 400
        service.estado = estado

    db.session.commit()
    return jsonify({'data': service_to_dict(service)})


@app.delete('/api/admin/servicios/<int:servicio_id>')
@jwt_required(roles=['admin'])
def eliminar_servicio_admin(servicio_id: int):
    service = db.session.get(Servicio, servicio_id)
    if not service:
        return jsonify({'error': 'Servicio no encontrado'}), 404

    related_cita = db.session.query(Cita.id).filter_by(servicio_id=service.id).first()
    related_order = db.session.query(OrdenServicio.id).filter_by(servicio_id=service.id).first()

    if related_cita or related_order:
        if service.estado != 'inactivo':
            service.estado = 'inactivo'
            db.session.commit()
        return jsonify({
            'data': service_to_dict(service),
            'message': 'Servicio desactivado porque tiene relaciones existentes.'
        })

    db.session.delete(service)
    db.session.commit()
    return jsonify({'message': 'Servicio eliminado correctamente.'})


def order_to_dict(order):
    if order and not order.recibo and order.id:
        try:
            asegurar_recibo_orden(order, do_commit=True)
        except Exception:
            db.session.rollback()

    recibo_data = None
    if order and order.recibo:
        recibo_data = {
            'id': order.recibo.id,
            'estado': order.recibo.estado,
            'subtotal': float(order.recibo.subtotal),
            'total': float(order.recibo.total),
        }

    return {
        'id': order.id,
        'cliente': {
            'id': order.cliente.id,
            'nombre': order.cliente.usuario.nombre,
            'apellido': order.cliente.usuario.apellido,
        },
        'vehiculo': {
            'id': order.vehiculo.id,
            'marca': order.vehiculo.marca,
            'modelo': order.vehiculo.modelo,
            'placa': order.vehiculo.placa,
        },
        'fecha_ingreso': order.fecha_ingreso.isoformat() if order.fecha_ingreso else None,
        'fecha_entrega': order.fecha_entrega.isoformat() if order.fecha_entrega else None,
        'kilometraje': order.kilometraje,
        'problema_reportado': order.problema_reportado,
        'diagnostico': order.diagnostico,
        'trabajo_realizado': order.trabajo_realizado,
        'observaciones': order.observaciones,
        'estado': order.estado,
        'subtotal': float(order.subtotal),
        'total': float(order.total),
        'recibo': recibo_data,
        'servicios': [
            {
                'id': item.id,
                'servicio_id': item.servicio_id,
                'nombre': item.servicio.nombre,
                'cantidad': item.cantidad,
                'precio': float(item.precio),
                'subtotal': float(item.subtotal),
            }
            for item in order.ordenes_servicios
        ],
    }


def apply_order_services(order, service_items):
    order.ordenes_servicios.clear()
    subtotal = Decimal('0.00')
    for item in service_items or []:
        service = db.session.get(Servicio, item.get('servicio_id'))
        quantity = int(item.get('cantidad', 1))
        if not service or service.estado != 'activo' or quantity < 1:
            raise ValueError('Servicio o cantidad inválidos')
        price = Decimal(str(item.get('precio', service.precio)))
        line_total = price * quantity
        order.ordenes_servicios.append(OrdenServicio(
            servicio=service,
            cantidad=quantity,
            precio=price,
            subtotal=line_total,
        ))
        subtotal += line_total
    order.subtotal = subtotal
    order.total = subtotal


@app.get('/api/admin/ordenes')
@jwt_required(roles=['admin'])
def admin_ordenes():
    orders = OrdenTrabajo.query.order_by(OrdenTrabajo.created_at.desc(), OrdenTrabajo.id.desc()).all()
    return jsonify({'data': [order_to_dict(order) for order in orders]})


@app.post('/api/admin/ordenes')
@jwt_required(roles=['admin'])
def crear_orden_admin():
    payload = request.get_json(silent=True) or {}
    cliente = db.session.get(Cliente, payload.get('cliente_id'))
    vehiculo = db.session.get(Vehiculo, payload.get('vehiculo_id'))
    if not cliente or not vehiculo or vehiculo.cliente_id != cliente.id:
        return jsonify({'error': 'Cliente o vehículo inválidos'}), 400
    if not payload.get('problema_reportado'):
        return jsonify({'error': 'El problema reportado es obligatorio'}), 400
    estado = payload.get('estado', 'pendiente')
    estados = {'pendiente', 'en_diagnostico', 'en_reparacion', 'terminada', 'entregada', 'cancelada'}
    if estado not in estados:
        return jsonify({'error': 'Estado inválido'}), 400
    order = OrdenTrabajo(
        cliente=cliente,
        vehiculo=vehiculo,
        fecha_ingreso=datetime.fromisoformat(payload['fecha_ingreso']) if payload.get('fecha_ingreso') else datetime.now(timezone.utc),
        kilometraje=payload.get('kilometraje', 0),
        problema_reportado=payload['problema_reportado'],
        diagnostico=payload.get('diagnostico'),
        trabajo_realizado=payload.get('trabajo_realizado'),
        observaciones=payload.get('observaciones'),
        estado=estado,
    )
    try:
        db.session.add(order)
        apply_order_services(order, payload.get('servicios'))
        db.session.flush()
        asegurar_recibo_orden(order, do_commit=False)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Conflicto de integridad al crear la orden.'}), 409
    except (ValueError, TypeError, ArithmeticError) as error:
        db.session.rollback()
        return jsonify({'error': str(error)}), 400
    if order.total > 0:
        notificacion_por_usuario(
            usuario_id=cliente.usuario_id,
            titulo=f'Costo de tu orden #{order.id}',
            mensaje=f'El costo estimado de tu orden es de ${float(order.total):.2f}. Puedes consultar el recibo y realizar el pago simulado desde Mis recibos.',
            tipo='pago',
            link='/mis-recibos',
        )
    return jsonify({'data': order_to_dict(order)}), 201


@app.get('/api/admin/ordenes/<int:orden_id>')
@jwt_required(roles=['admin'])
def obtener_orden_admin(orden_id):
    order = db.session.get(OrdenTrabajo, orden_id)
    if not order:
        return jsonify({'error': 'Orden no encontrada'}), 404
    return jsonify({'data': order_to_dict(order)})


@app.put('/api/admin/ordenes/<int:orden_id>')
@jwt_required(roles=['admin'])
def actualizar_orden_admin(orden_id):
    order = db.session.get(OrdenTrabajo, orden_id)
    if not order:
        return jsonify({'error': 'Orden no encontrada'}), 404
    payload = request.get_json(silent=True) or {}
    if 'vehiculo_id' in payload:
        vehicle = db.session.get(Vehiculo, payload['vehiculo_id'])
        if not vehicle or vehicle.cliente_id != order.cliente_id:
            return jsonify({'error': 'Vehículo inválido para el cliente de la orden'}), 400
        order.vehiculo_id = vehicle.id
    for field in ['fecha_entrega', 'diagnostico', 'trabajo_realizado', 'observaciones', 'problema_reportado']:
        if field in payload:
            setattr(order, field, datetime.fromisoformat(payload[field]) if field == 'fecha_entrega' and payload[field] else payload[field])
    if 'kilometraje' in payload:
        order.kilometraje = payload['kilometraje']
    if 'estado' in payload:
        estados = {'pendiente', 'en_diagnostico', 'en_reparacion', 'terminada', 'entregada', 'cancelada'}
        if payload['estado'] not in estados:
            return jsonify({'error': 'Estado inválido'}), 400
        estado_anterior = order.estado
        order.estado = payload['estado']
        if estado_anterior != order.estado:
            TIPO_ESTADO = {
                'pendiente': 'Estado del vehículo',
                'en_diagnostico': 'Diagnóstico',
                'en_reparacion': 'Reparación en proceso',
                'terminada': 'Reparación finalizada',
                'entregada': 'Vehículo listo',
                'cancelada': 'Sistema',
            }
            notificacion_por_usuario(
                usuario_id=order.cliente.usuario_id,
                titulo=f'Orden #{order.id} - {TIPO_ESTADO.get(order.estado, "Sistema")}',
                mensaje=f'El estado de tu orden de trabajo ha cambiado a "{order.estado}".',
                tipo=TIPO_ESTADO.get(order.estado, 'sistema'),
                link=f'/ordenes/{order.id}',
                do_commit=False,
            )
    try:
        if 'servicios' in payload:
            apply_order_services(order, payload['servicios'])
        db.session.flush()
        asegurar_recibo_orden(order, do_commit=False)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Conflicto de integridad al actualizar la orden.'}), 409
    except (ValueError, TypeError, ArithmeticError) as error:
        db.session.rollback()
        return jsonify({'error': str(error)}), 400
    if 'servicios' in payload and order.total > 0:
        notificacion_por_usuario(
            usuario_id=order.cliente.usuario_id,
            titulo=f'Costo actualizado de tu orden #{order.id}',
            mensaje=f'El costo de tu orden se actualizó a ${float(order.total):.2f}. Puedes consultar el recibo y realizar el pago simulado desde Mis recibos.',
            tipo='pago',
            link='/mis-recibos',
        )
    return jsonify({'data': order_to_dict(order)})


@app.delete('/api/admin/ordenes/<int:orden_id>')
@jwt_required(roles=['admin'])
def eliminar_orden_admin(orden_id):
    order = db.session.get(OrdenTrabajo, orden_id)
    if not order:
        return jsonify({'error': 'Orden no encontrada'}), 404
    if order.recibo:
        return jsonify({'error': 'No se puede eliminar una orden con recibo'}), 409
    db.session.delete(order)
    db.session.commit()
    return jsonify({'message': 'Orden eliminada correctamente'})


@app.get('/api/admin/dashboard')
@jwt_required(roles=['admin'])
def admin_dashboard():
    usuarios_count = db.session.query(db.func.count(Usuario.id)).scalar() or 0
    clientes_count = db.session.query(db.func.count(Cliente.id)).scalar() or 0
    vehiculos_count = db.session.query(db.func.count(Vehiculo.id)).scalar() or 0
    citas_pendientes = db.session.query(db.func.count(Cita.id)).filter(Cita.estado == 'pendiente').scalar() or 0
    citas_hoy = db.session.query(db.func.count(Cita.id)).filter(Cita.fecha == datetime.now(timezone.utc).date()).scalar() or 0
    ordenes_pendientes = db.session.query(db.func.count(OrdenTrabajo.id)).filter(OrdenTrabajo.estado == 'pendiente').scalar() or 0
    ordenes_reparacion = db.session.query(db.func.count(OrdenTrabajo.id)).filter(OrdenTrabajo.estado == 'en_reparacion').scalar() or 0
    ordenes_terminadas = db.session.query(db.func.count(OrdenTrabajo.id)).filter(OrdenTrabajo.estado == 'terminada').scalar() or 0
    recibos_pendientes = db.session.query(db.func.count(Recibo.id)).filter(Recibo.estado == 'pendiente').scalar() or 0
    recibos_pagados = db.session.query(db.func.count(Recibo.id)).filter(Recibo.estado == 'pagado').scalar() or 0
    ingresos_totales = db.session.query(db.func.coalesce(db.func.sum(Pago.monto), 0)).filter(Pago.estado == 'completado').scalar() or 0

    citas_recientes = Cita.query.order_by(Cita.fecha.desc(), Cita.hora.desc()).limit(5).all()
    ordenes_recientes = OrdenTrabajo.query.order_by(OrdenTrabajo.created_at.desc(), OrdenTrabajo.id.desc()).limit(5).all()
    pagos_recientes = Pago.query.filter_by(estado='completado').order_by(Pago.fecha_pago.desc(), Pago.id.desc()).limit(5).all()

    return jsonify({'data': {
        'usuarios': usuarios_count,
        'clientes': clientes_count,
        'vehiculos': vehiculos_count,
        'citas_pendientes': citas_pendientes,
        'citas_hoy': citas_hoy,
        'ordenes_pendientes': ordenes_pendientes,
        'ordenes_reparacion': ordenes_reparacion,
        'ordenes_terminadas': ordenes_terminadas,
        'recibos_pendientes': recibos_pendientes,
        'recibos_pagados': recibos_pagados,
        'ingresos_totales': float(ingresos_totales),
        'citas_recientes': [
            {
                'id': cita.id,
                'fecha': str(cita.fecha) if cita.fecha else '',
                'hora': str(cita.hora)[:5] if cita.hora else '',
                'cliente': f'{cita.cliente.usuario.nombre} {cita.cliente.usuario.apellido}' if (cita.cliente and cita.cliente.usuario) else 'Sin cliente',
                'vehiculo': f'{cita.vehiculo.marca} {cita.vehiculo.modelo}' if cita.vehiculo else 'Sin vehículo',
                'servicio': cita.servicio.nombre if cita.servicio else 'Sin servicio',
                'estado': cita.estado,
            }
            for cita in citas_recientes
        ],
        'ordenes_recientes': [
            {
                'id': orden.id,
                'cliente': f'{orden.cliente.usuario.nombre} {orden.cliente.usuario.apellido}' if (orden.cliente and orden.cliente.usuario) else 'Sin cliente',
                'vehiculo': f'{orden.vehiculo.marca} {orden.vehiculo.modelo} ({orden.vehiculo.placa})' if orden.vehiculo else 'Sin vehículo',
                'estado': orden.estado,
                'total': float(orden.total),
                'fecha_ingreso': orden.fecha_ingreso.strftime('%Y-%m-%d %H:%M') if orden.fecha_ingreso else '',
            }
            for orden in ordenes_recientes
        ],
        'pagos_recientes': [
            {
                'id': pago.id,
                'referencia': pago.referencia or f'PAGO-{pago.id}',
                'cliente': f'{pago.recibo.orden_trabajo.cliente.usuario.nombre} {pago.recibo.orden_trabajo.cliente.usuario.apellido}' if (pago.recibo and pago.recibo.orden_trabajo and pago.recibo.orden_trabajo.cliente and pago.recibo.orden_trabajo.cliente.usuario) else 'Cliente',
                'metodo_pago': (pago.metodo_pago or 'Nequi').capitalize(),
                'monto': float(pago.monto),
                'fecha_pago': pago.fecha_pago.strftime('%Y-%m-%d %H:%M') if pago.fecha_pago else '',
            }
            for pago in pagos_recientes
        ],
    }})


if __name__ == '__main__':
    app.run(
        debug=True,
        host=os.getenv('HOST', '0.0.0.0'),
        port=int(os.getenv('PORT', '5000')),
    )
