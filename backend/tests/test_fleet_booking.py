from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.dialects.mysql import TINYINT
from sqlalchemy.ext.compiler import compiles

from app import create_app, db, Usuario, Vehiculo, Servicio, Cita
from app.models import EmpresaConvenio, Notificacion
from app.auth.jwt import decode_token


def test_fleet_booking_and_scope(tmp_path):
    uri = 'sqlite:///' + (tmp_path / 'fleet.db').as_posix()
    engine = create_engine(uri)
    compiles(TINYINT, 'sqlite')(lambda *args, **kwargs: 'INTEGER')
    db.metadata.create_all(engine, tables=[m.__table__ for m in (EmpresaConvenio, Usuario, Vehiculo, Servicio, Cita, Notificacion)])
    app = create_app({'TESTING': True, 'PORTAL_FLOTAS_ACTIVO': True, 'SQLALCHEMY_DATABASE_URI': uri})
    with app.app_context():
        db.session.add_all([EmpresaConvenio(nit=n, codigo_acceso=n) for n in ('ALFA',)])
        service = Servicio(nombre='Revisión')
        db.session.add(service)
        db.session.commit()
        service_id = service.id
    client = app.test_client()

    def login(code):
        return client.post('/api/convenios/validar-codigo', json={'codigo': code}).get_json()['token']

    tokens = [login(code) for code in ('ALFA',)]
    headers = [dict(Authorization='Bearer ' + token) for token in tokens]
    with app.app_context():
        claims = decode_token(tokens[0])
        assert claims['exp'] - claims['iat'] == 7200
    assert client.get('/api/auth/me', headers=headers[0]).status_code == 403
    vehicle = dict(placa='ABC123', marca='Toyota', modelo='Hiace', numero_interno='Móvil 04')
    result = client.post('/api/convenios/vehiculos', json=vehicle, headers=headers[0])
    assert result.status_code == 201
    assert client.post('/api/convenios/validar-codigo', json={'codigo':'BETA'}).status_code == 401
    booking = dict(vehiculo_id=result.json['id'], servicio_id=service_id, fecha=str(date.today() + timedelta(days=2)),
                   hora='10:00', motivo='Revisión urgente', nombre_conductor_entrega='Ana', telefono_conductor='3001234567')
    assert client.post('/api/citas', json={**booking, 'vehiculo_id': 99999}, headers=headers[0]).status_code == 403
    result = client.post('/api/citas', json=booking, headers=headers[0])
    assert result.status_code == 201 and result.json['data']['metodo_facturacion'] == 'credito_convenio'
    inbox = client.get('/api/convenios/notificaciones', headers=headers[0]).json
    assert inbox['pendientes'] == 1 and inbox['data'][0]['tipo'] == 'cita'
    response = client.post('/api/convenios/notificaciones', headers=headers[0], json={'id': inbox['data'][0]['id']})
    assert response.json['pendientes'] == 0
    app.config['PORTAL_FLOTAS_ACTIVO'] = False
    assert client.get('/api/convenios/disponibilidad-portal').status_code == 404
    assert client.get('/api/convenios/notificaciones', headers=headers[0]).status_code == 404
    assert client.post('/api/citas', headers=headers[0], json=booking).status_code == 403
    app.config['PORTAL_FLOTAS_ACTIVO'] = True
    assert result.json['data']['prioridad'] == 'emergencia_flota'
    assert client.post('/api/citas', json=booking, headers=headers[0]).status_code == 409
    with app.app_context():
        EmpresaConvenio.query.filter_by(nit='ALFA').first().activo = False
        db.session.commit()
    assert client.get('/api/convenios/flota', headers=headers[0]).status_code == 401
