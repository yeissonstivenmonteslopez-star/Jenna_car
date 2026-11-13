"""Opt-in integration tests; create and clean only uniquely tagged QA records.

Set JENNA_MYSQL_TESTS=1 explicitly. No DDL, real mail or provider requests.
Existing rows are never edited or removed.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import date, time
from io import BytesIO
import os
from pathlib import Path
import sys
from threading import Barrier
import uuid

import pytest
from PIL import Image

pytestmark = pytest.mark.skipif(os.getenv('JENNA_MYSQL_TESTS') != '1', reason='Requires explicit isolated-record MySQL integration mode')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app as backend
from app.services import citas_s, repair_updates
from app.models import Usuario, Vehiculo, Servicio, Cita, OrdenTrabajo, Recibo, Pago, Diagnostico, Trabajo, ImagenTrabajo, Notificacion


@pytest.fixture
def qa(monkeypatch):
    monkeypatch.setattr(citas_s, 'notificacion_por_usuario', lambda **kwargs: None)
    monkeypatch.setattr(citas_s, '_send_appointment_confirmation', lambda *args: None)
    monkeypatch.setattr(repair_updates, 'enviar_correo_async', lambda *args: False)
    tag = uuid.uuid4().hex
    with backend.app.app_context():
        db = backend.db
        users = [Usuario(nombre='QA', apellido='Isolated', email=f'{tag}-{role}-{i}@example.invalid', rol=role, estado='activo') for i, role in enumerate(['usuario', 'usuario', 'mecanico'])]
        db.session.add_all(users); db.session.flush()
        vehicles = [Vehiculo(usuario_id=users[i].id, placa=f'QA{tag[:6]}{i}', marca='QA', modelo='Test', estado='activo', kilometraje=0, tipo_combustible='gasolina') for i in range(2)]
        service = Servicio(nombre=f'QA-{tag}', precio=15000, duracion_estimada=90, estado='activo')
        db.session.add_all([*vehicles, service]); db.session.flush()
        order = OrdenTrabajo(vehiculo_id=vehicles[0].id, problema_reportado=f'QA-{tag}', estado='en_reparacion', estado_aprobacion='aprobado', subtotal=15000, total=15000, kilometraje=0)
        db.session.add(order); db.session.flush()
        receipt = Recibo(orden_id=order.id, subtotal=15000, total=15000, descuento=0, estado='pendiente', enviado_cliente=True)
        db.session.add(receipt); db.session.commit()
        state = dict(users=[row.id for row in users], vehicles=[row.id for row in vehicles], service=service.id, order=order.id, receipt=receipt.id,
                     tokens=[backend.create_access_token(row) for row in users], key=tag)
    try:
        yield state
    finally:
        # Delete only records belonging to this fixture's newly created PKs.
        # Roll back any failed request before executing cleanup.
        with backend.app.app_context():
            db = backend.db; db.session.rollback()
            works = Trabajo.query.filter(Trabajo.mecanico_id == state['users'][2]).all()
            for work in works:
                for image in work.imagenes:
                    path = repair_updates.UPLOAD_DIR / Path(image.ruta_imagen).name
                    path.unlink(missing_ok=True)
            ImagenTrabajo.query.filter(ImagenTrabajo.usuario_id == state['users'][2]).delete(synchronize_session=False)
            Trabajo.query.filter(Trabajo.mecanico_id == state['users'][2]).delete(synchronize_session=False)
            Diagnostico.query.filter(Diagnostico.mecanico_id == state['users'][2]).delete(synchronize_session=False)
            Pago.query.filter(Pago.usuario_id.in_(state['users'][:2])).delete(synchronize_session=False)
            Recibo.query.filter_by(id=state['receipt']).delete(synchronize_session=False)
            OrdenTrabajo.query.filter_by(id=state['order']).delete(synchronize_session=False)
            Cita.query.filter(Cita.vehiculo_id.in_(state['vehicles'])).delete(synchronize_session=False)
            Notificacion.query.filter(Notificacion.usuario_id.in_(state['users'])).delete(synchronize_session=False)
            Vehiculo.query.filter(Vehiculo.id.in_(state['vehicles'])).delete(synchronize_session=False)
            Servicio.query.filter_by(id=state['service']).delete(synchronize_session=False)
            Usuario.query.filter(Usuario.id.in_(state['users'])).delete(synchronize_session=False)
            db.session.commit()


def headers(qa, index=0):
    return {'Authorization': f"Bearer {qa['tokens'][index]}"}


def booking(qa, index=0, hour='10:00'):
    return dict(vehiculo_id=qa['vehicles'][index], servicio_id=qa['service'], mecanico_id=qa['users'][2], fecha='2099-03-15', hora=hour)


def test_two_simultaneous_requests_only_one_reserves(qa):
    barrier = Barrier(2)
    def reserve(index):
        with backend.app.test_client() as client:
            barrier.wait(timeout=10)
            return client.post('/api/citas', headers=headers(qa, index), json=booking(qa, index)).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(reserve, [0, 1])) == [201, 409]


def test_profile_details_and_photo_persist_on_new_request(qa, tmp_path, monkeypatch):
    monkeypatch.setitem(backend.app.config, 'UPLOADS_PATH', str(tmp_path))
    with backend.app.test_client() as client:
        response = client.put('/api/usuarios/perfil', headers=headers(qa), data={
            'nombre': 'Perfil QA', 'apellido': 'Actualizado', 'telefono': '3001234567',
        })
        assert response.status_code == 200, response.json
        image = BytesIO(); Image.new('RGB', (20, 20), 'red').save(image, 'PNG'); image.seek(0)
        response = client.post('/api/usuarios/perfil/foto', headers=headers(qa), data={'foto': (image, 'profile.png')})
        assert response.status_code == 200, response.json
        photo = response.json['user']['foto_perfil']
        assert (tmp_path / Path(photo).name).exists()
    with backend.app.test_client() as fresh_client:
        persisted = fresh_client.get('/api/auth/me', headers=headers(qa)).json['user']
        assert persisted['nombre'] == 'Perfil QA' and persisted['apellido'] == 'Actualizado'
        assert persisted['telefono'] == '3001234567' and persisted['foto_perfil'] == photo
        assert fresh_client.get(photo).status_code == 200


def test_profile_rejects_fake_image_without_saving_it(qa, tmp_path, monkeypatch):
    monkeypatch.setitem(backend.app.config, 'UPLOADS_PATH', str(tmp_path))
    with backend.app.test_client() as client:
        before = client.get('/api/auth/me', headers=headers(qa)).json['user']['foto_perfil']
        response = client.post('/api/usuarios/perfil/foto', headers=headers(qa), data={'foto': (BytesIO(b'not an image'), 'fake.png')})
        assert response.status_code == 400
        assert client.get('/api/auth/me', headers=headers(qa)).json['user']['foto_perfil'] == before
        assert list(tmp_path.iterdir()) == []


def test_duration_cancel_and_rebook_same_vehicle_slot(qa):
    with backend.app.test_client() as client:
        first = client.post('/api/citas', headers=headers(qa), json=booking(qa))
        assert first.status_code == 201, first.json
        assert client.post('/api/citas', headers=headers(qa, 1), json=booking(qa, 1, '11:00')).status_code == 409
        cancelled = client.post(f"/api/citas/{first.json['data']['id']}/cancelar", headers=headers(qa))
        assert cancelled.status_code == 200, cancelled.json
        again = client.post('/api/citas', headers=headers(qa), json=booking(qa))
        assert again.status_code == 201, again.json
        with backend.app.app_context():
            assert Cita.query.filter(Cita.vehiculo_id == qa['vehicles'][0]).count() == 2


@pytest.mark.parametrize('outcome,state,receipt_state', [('aprobado','completado','pagado'),('rechazado','anulado','pendiente'),('pendiente','pendiente','pendiente')])
def test_real_database_payment_outcomes_and_replay(qa, outcome, state, receipt_state):
    payload = dict(recibo_id=qa['receipt'], metodo='nequi', resultado=outcome, idempotencia=qa['key'])
    with backend.app.test_client() as client:
        response = client.post('/api/pagos/simulados', headers=headers(qa), json=payload)
        assert response.status_code == 201, response.json
        assert response.json['data']['estado'] == state and response.json['data']['monto'] == 15000
        replay = client.post('/api/pagos/simulados', headers=headers(qa), json=payload)
        assert replay.status_code == 200 and replay.json['data']['id'] == response.json['data']['id']
        history = client.get('/api/pagos/mis-pagos', headers=headers(qa))
        assert history.status_code == 200, history.json
        assert any(row['id'] == response.json['data']['id'] for row in history.json['data'])
        detail = client.get(f"/api/pagos/{response.json['data']['id']}", headers=headers(qa))
        assert detail.status_code == 200 and detail.json['data']['id'] == response.json['data']['id']
    with backend.app.app_context():
        assert backend.db.session.get(Recibo, qa['receipt']).estado == receipt_state
        assert Pago.query.filter_by(recibo_id=qa['receipt']).count() == 1


def test_payment_owner_and_sensitive_data_rejected(qa):
    payload = dict(recibo_id=qa['receipt'], metodo='tarjeta', franquicia='visa', resultado='aprobado', idempotencia=qa['key'])
    with backend.app.test_client() as client:
        assert client.post('/api/pagos/simulados', headers=headers(qa, 1), json=payload).status_code == 404
        assert client.post('/api/pagos/simulados', headers=headers(qa), json={**payload, 'cvv': '123'}).status_code == 400


def test_simultaneous_payment_retries_insert_only_one_payment(qa):
    barrier = Barrier(2)
    payload = dict(recibo_id=qa['receipt'], metodo='tarjeta', franquicia='mastercard', resultado='aprobado', idempotencia=qa['key'])
    def pay(_):
        with backend.app.test_client() as client:
            barrier.wait(timeout=10)
            return client.post('/api/pagos/simulados', headers=headers(qa), json=payload).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(pay, [0, 1])) == [200, 201]
    with backend.app.app_context():
        assert Pago.query.filter_by(recibo_id=qa['receipt']).count() == 1


def test_photo_observation_followup_ownership_and_mail_retry(qa, monkeypatch):
    with backend.app.app_context():
        db = backend.db
        appointment = Cita(vehiculo_id=qa['vehicles'][0], servicio_id=qa['service'], mecanico_id=qa['users'][2], fecha=date(2099, 3, 15), hora=time(10), estado='confirmada')
        db.session.add(appointment); db.session.flush()
        diagnostic = Diagnostico(cita_id=appointment.id, mecanico_id=qa['users'][2], descripcion='QA diagnostic', estado='en_proceso')
        db.session.add(diagnostic); db.session.flush()
        work = Trabajo(diagnostico_id=diagnostic.id, mecanico_id=qa['users'][2], servicio_id=qa['service'], orden_id=qa['order'], descripcion='QA repair', estado='pendiente', cantidad=1, precio=15000, subtotal=15000)
        db.session.add(work); db.session.commit(); work_id = work.id
    image = BytesIO(); Image.new('RGB', (20, 20), 'red').save(image, 'PNG'); image.seek(0)
    with backend.app.test_client() as client:
        response = client.post(f'/api/mechanic/works/{work_id}/updates', headers=headers(qa, 2), data={'estado':'en_proceso', 'observaciones':'Revisión de prueba completada', 'files':(image, 'test.png')})
        assert response.status_code == 201, response.json
        assert response.json['data']['correo_enviado'] is False
        notification = response.json['data']['notificacion_id']
        owner = client.get('/api/ordenes/mis-ordenes', headers=headers(qa))
        assert owner.status_code == 200, owner.json
        row = next(row for row in owner.json['data'] if row['id'] == qa['order'])
        assert row['trabajos'][0]['diagnostico']['observaciones'] == 'Revisión de prueba completada'
        image_id = row['trabajos'][0]['imagenes'][0]['id']
        progress = client.get(f"/api/mechanic/client/repairs/{qa['vehicles'][0]}/progress", headers=headers(qa))
        assert progress.status_code == 200, progress.json
        assert progress.json['data'][0]['imagenes'][0]['id'] == image_id
        assert progress.json['data'][0]['imagenes'][0]['created_at']
        assert client.get(f'/api/mechanic/images/{image_id}', headers=headers(qa)).status_code == 200
        assert client.get(f'/api/mechanic/images/{image_id}', headers=headers(qa, 1)).status_code == 404
        calls = []
        monkeypatch.setattr(repair_updates, 'enviar_correo_async', lambda *args: calls.append(args) or True)
        assert client.post(f'/api/mechanic/updates/{notification}/retry-email', headers=headers(qa, 2)).json['data']['correo_enviado'] is True
        assert client.post(f'/api/mechanic/updates/{notification}/retry-email', headers=headers(qa, 2)).status_code == 200
        assert len(calls) == 1
