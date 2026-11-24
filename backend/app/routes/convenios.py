from datetime import datetime, timedelta, timezone
import os
import secrets
from calendar import monthrange
from ..models.empresa import BOGOTA
import re
import uuid
import jwt
from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import IntegrityError
from ..auth.decorators import jwt_required
from ..extensions import db
from ..models import EmpresaConvenio, Servicio, Usuario, Vehiculo

convenios_bp = Blueprint('convenios', __name__)


@convenios_bp.get('/disponibilidad-portal')
def disponibilidad_portal():
    return jsonify(activo=current_app.config.get('PORTAL_FLOTAS_ACTIVO', False))


@convenios_bp.before_request
def verificar_portal():
    if not current_app.config.get('PORTAL_FLOTAS_ACTIVO', False):
        return jsonify(error='Recurso no disponible'), 404


def codigos_mensuales_activos():
    return os.getenv('CONVENIO_CODIGO_MENSUAL') == '1'


def vehicle_data(v):
    return {key: getattr(v, key) for key in ('id', 'placa', 'numero_interno', 'tipo_vehiculo', 'marca', 'modelo')}


def fleet(empresa):
    return dict(empresa=dict(id=empresa.id, nit=empresa.nit,
                             dias_credito=empresa.dias_credito, porcentaje_descuento=float(empresa.porcentaje_descuento)),
                vehiculos=[vehicle_data(v) for v in Vehiculo.query.filter_by(empresa_id=empresa.id).order_by(Vehiculo.numero_interno).all()],
                servicios=[dict(id=s.id, nombre=s.nombre) for s in Servicio.query.filter_by(estado='activo').order_by(Servicio.nombre).all()])


@convenios_bp.post('/codigo-mensual')
@jwt_required(roles=['admin'])
def codigo_mensual():
    if not codigos_mensuales_activos():
        return jsonify(error='Opción no disponible.'), 404
    empresa = EmpresaConvenio.query.filter_by(activo=True).with_for_update().first()
    if not empresa:
        return jsonify(error='No hay convenio activo.'), 404
    now = datetime.now(BOGOTA)
    periodo = now.strftime('%Y-%m')
    if empresa.periodo_codigo != periodo:
        empresa.codigo_acceso = secrets.token_hex(8).upper()
        empresa.periodo_codigo = periodo
    codigo = empresa.codigo_acceso
    db.session.commit()
    response = jsonify(codigo=codigo, ultimo_dia=now.date().replace(day=monthrange(now.year, now.month)[1]).isoformat())
    response.headers['Cache-Control'] = 'no-store'
    return response


@convenios_bp.post('/validar-codigo')
def validar_codigo():
    body = request.get_json(silent=True)
    code = body.get('codigo') if isinstance(body, dict) else None
    if not isinstance(code, str) or not 1 <= len(code.strip()) <= 30:
        return jsonify(error='Ingresa un código de convenio válido.'), 400
    now = datetime.now(BOGOTA)
    query = EmpresaConvenio.query.filter_by(codigo_acceso=code.strip().upper(), activo=True)
    if codigos_mensuales_activos():
        query = query.filter_by(periodo_codigo=now.strftime('%Y-%m'))
    empresa = query.first()
    if not empresa:
        return jsonify(error='Código de convenio inválido o inactivo.'), 401
    fin = (now.replace(day=28) + timedelta(days=4)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    token = jwt.encode(dict(sub=f'convenio:{empresa.id}', empresa_id=empresa.id, rol='acceso_convenio',
                            iat=now, exp=min(now + timedelta(hours=2), fin) if codigos_mensuales_activos() else now + timedelta(hours=2)), current_app.config['SECRET_KEY'], algorithm='HS256')
    return jsonify(token=token, **fleet(empresa))


def current_company():
    empresa = getattr(request, 'empresa', None) or request.current_user.empresa
    return empresa if empresa and empresa.activo else None


@convenios_bp.get('/flota')
@jwt_required(allow_convenio=True)
def flota():
    empresa = current_company()
    if not empresa:
        return jsonify(error='Convenio no disponible'), 403
    return jsonify(fleet(empresa))


@convenios_bp.get('/horarios')
@jwt_required(allow_convenio=True)
def horarios():
    from ..services.citas_s import available_times
    empresa = current_company()
    vehicle = request.args.get('vehiculo_id', type=int)
    service = request.args.get('servicio_id', type=int)
    if not empresa or not Vehiculo.query.filter_by(id=vehicle, empresa_id=empresa.id).first():
        return jsonify(error='Móvil no disponible para el convenio.'), 403
    if not service:
        return jsonify(error='Selecciona un servicio.'), 400
    slots, error, status = available_times(request.args.get('fecha'), service, vehicle)
    return (jsonify(error=error), status) if error else jsonify(slots)


@convenios_bp.post('/vehiculos')
@jwt_required(allow_convenio=True)
def agregar_vehiculo():
    empresa = current_company()
    if not empresa:
        return jsonify(error='Convenio no disponible'), 403
    payload = request.get_json(silent=True)
    values = {}
    for key, limit in [('placa', 6), ('numero_interno', 30), ('marca', 100), ('modelo', 100)]:
        value = payload.get(key) if isinstance(payload, dict) else None
        if not isinstance(value, str) or not 1 <= len(value.strip()) <= limit:
            return jsonify(error='Completa la placa, el móvil, la marca y el modelo.'), 400
        values[key] = value.strip()
    tipo = payload.get('tipo_vehiculo', 'Ambulancia')
    if tipo not in ('Ambulancia', 'Otro tipo de servicio'):
        return jsonify(error='Selecciona un tipo de vehículo válido.'), 400
    values['tipo_vehiculo'] = tipo
    values['placa'] = values['placa'].upper()
    if not re.fullmatch(r'[A-Z]{3}[0-9]{3}', values['placa']):
        return jsonify(error='La placa debe tener tres letras y tres números.'), 400
    # Serialize assignment of the required vehicle owner for a newly provisioned fleet.
    empresa = EmpresaConvenio.query.filter_by(id=empresa.id, activo=True).with_for_update().first()
    if not empresa:
        return jsonify(error='Convenio inactivo'), 403
    owner = Usuario.query.filter_by(empresa_id=empresa.id, rol='gestor_flota', estado='inactivo').filter(Usuario.email.like('%@flota.invalid')).order_by(Usuario.id).with_for_update().first()
    if not owner:
        owner = Usuario(empresa_id=empresa.id, rol='gestor_flota', estado='inactivo', nombre=f'Convenio {empresa.nit}',
                        apellido='Flota', email=f'{uuid.uuid4().hex}@flota.invalid')
        db.session.add(owner)
    vehicle = Vehiculo(cliente=owner, empresa_id=empresa.id, **values)
    db.session.add(vehicle)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error='La placa o el número interno ya está registrado.'), 409
    return jsonify(vehicle_data(vehicle)), 201


@convenios_bp.route('/notificaciones', methods=['GET', 'POST'])
@jwt_required(allow_convenio=True)
def notificaciones():
    from ..models import Notificacion
    empresa = current_company()
    if not empresa:
        return jsonify(error='Convenio no disponible'), 403
    # Only the fleet's dedicated mailbox. A manager's personal inbox stays private.
    owners = db.select(Usuario.id).where(Usuario.empresa_id == empresa.id,
        Usuario.rol == 'gestor_flota', Usuario.email.like('%@flota.invalid'), Usuario.estado == 'inactivo')
    inbox = Notificacion.query.filter(Notificacion.usuario_id.in_(owners))
    if request.method == 'POST':
        payload = request.get_json(silent=True) or {}
        if payload.get('todas') is True:
            inbox.filter_by(leida=False).update({'leida': True}, synchronize_session=False)
        else:
            item = inbox.filter_by(id=payload.get('id')).first()
            if not item:
                return jsonify(error='Notificación no encontrada'), 404
            item.leida = True
        db.session.commit()
    page = max(1, request.args.get('page', 1, type=int))
    items = inbox.order_by(Notificacion.id.desc()).paginate(page=page, per_page=20, error_out=False)
    return jsonify(data=[n.to_dict() for n in items.items], paginas=items.pages,
                   pendientes=inbox.filter_by(leida=False).count())
