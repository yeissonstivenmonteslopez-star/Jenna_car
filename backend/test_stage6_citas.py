import os
import sys
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import app as backend_app

backend_app.app.config['TESTING'] = True


def qa_cita_stage6(prefix=None):
    prefix = prefix or uuid.uuid4().hex[:8]
    admin_email = f'cita6_admin_{prefix}@jennacar.test'
    user_email = f'cita6_user_{prefix}@jennacar.test'
    user2_email = f'cita6_user2_{prefix}@jennacar.test'
    doc = f'CIT6-{prefix}'
    doc2 = f'CIT6B-{prefix}'

    with backend_app.app.app_context():
        admin = backend_app.Usuario.query.filter_by(email=admin_email).first()
        if not admin:
            admin = backend_app.Usuario(
                nombre='Cita6',
                apellido='Admin',
                email=admin_email,
                password=backend_app.generate_password_hash('admin123'),
                rol='admin',
                estado='activo',
            )
            backend_app.db.session.add(admin)
            backend_app.db.session.flush()

        user = backend_app.Usuario.query.filter_by(email=user_email).first()
        if not user:
            user = backend_app.Usuario(
                nombre='Cita6',
                apellido='User',
                email=user_email,
                password=backend_app.generate_password_hash('user123'),
                rol='usuario',
                estado='activo',
            )
            backend_app.db.session.add(user)
            backend_app.db.session.flush()

        user2 = backend_app.Usuario.query.filter_by(email=user2_email).first()
        if not user2:
            user2 = backend_app.Usuario(
                nombre='Cita6',
                apellido='User2',
                email=user2_email,
                password=backend_app.generate_password_hash('user123'),
                rol='usuario',
                estado='activo',
            )
            backend_app.db.session.add(user2)
            backend_app.db.session.flush()

        customer = backend_app.Cliente.query.filter_by(documento=doc).first()
        if not customer:
            customer = backend_app.Cliente(
                usuario_id=user.id,
                documento=doc,
                direccion='Cita6 QA',
                ciudad='Bogotá',
            )
            backend_app.db.session.add(customer)
            backend_app.db.session.flush()

        customer2 = backend_app.Cliente.query.filter_by(documento=doc2).first()
        if not customer2:
            customer2 = backend_app.Cliente(
                usuario_id=user2.id,
                documento=doc2,
                direccion='Cita6 QA 2',
                ciudad='Bogotá',
            )
            backend_app.db.session.add(customer2)
            backend_app.db.session.flush()

        vehicle = backend_app.Vehiculo.query.filter_by(placa=f'Q6{prefix[:5].upper()}').first()
        if not vehicle:
            vehicle = backend_app.Vehiculo(
                cliente_id=customer.id,
                placa=f'Q6{prefix[:5].upper()}',
                marca='Toyota',
                modelo='Corolla',
                anio=2024,
                color='Rojo',
                kilometraje=5000,
                tipo_combustible='gasolina',
                estado='activo',
            )
            backend_app.db.session.add(vehicle)
            backend_app.db.session.flush()

        vehicle2 = backend_app.Vehiculo.query.filter_by(placa=f'Q6B{prefix[:5].upper()}').first()
        if not vehicle2:
            vehicle2 = backend_app.Vehiculo(
                cliente_id=customer2.id,
                placa=f'Q6B{prefix[:5].upper()}',
                marca='Mazda',
                modelo='CX-5',
                anio=2023,
                color='Blanco',
                kilometraje=8000,
                tipo_combustible='gasolina',
                estado='activo',
            )
            backend_app.db.session.add(vehicle2)
            backend_app.db.session.flush()

        service = backend_app.Servicio.query.filter_by(nombre=f'QA Service Stage6 {prefix}').first()
        if not service:
            service = backend_app.Servicio(
                nombre=f'QA Service Stage6 {prefix}',
                descripcion='Servicio QA Stage6',
                precio=150.00,
                duracion_estimada=60,
                estado='activo',
            )
            backend_app.db.session.add(service)
            backend_app.db.session.flush()

        backend_app.db.session.commit()
        admin_token = backend_app.create_access_token(backend_app.db.session.get(backend_app.Usuario, admin.id))
        user_token = backend_app.create_access_token(backend_app.db.session.get(backend_app.Usuario, user.id))
        user2_token = backend_app.create_access_token(backend_app.db.session.get(backend_app.Usuario, user2.id))

        return {
            'prefix': prefix,
            'admin_token': admin_token,
            'user_token': user_token,
            'user2_token': user2_token,
            'customer_id': customer.id,
            'customer2_id': customer2.id,
            'vehicle_id': vehicle.id,
            'vehicle2_id': vehicle2.id,
            'service_id': service.id,
        }


def cleanup_cita_stage6(state):
    if not state:
        return
    with backend_app.app.app_context():
        admin = backend_app.Usuario.query.filter_by(email=f"cita6_admin_{state['prefix']}@jennacar.test").first()
        user = backend_app.Usuario.query.filter_by(email=f"cita6_user_{state['prefix']}@jennacar.test").first()
        user2 = backend_app.Usuario.query.filter_by(email=f"cita6_user2_{state['prefix']}@jennacar.test").first()
        customer = backend_app.Cliente.query.filter_by(documento=f"CIT6-{state['prefix']}").first()
        customer2 = backend_app.Cliente.query.filter_by(documento=f"CIT6B-{state['prefix']}").first()
        vehicle = backend_app.Vehiculo.query.filter_by(placa=f"Q6{state['prefix'][:5].upper()}").first()
        vehicle2 = backend_app.Vehiculo.query.filter_by(placa=f"Q6B{state['prefix'][:5].upper()}").first()
        service = backend_app.Servicio.query.filter_by(nombre=f"QA Service Stage6 {state['prefix']}").first()

        for cita in backend_app.Cita.query.filter_by(cliente_id=customer.id).all() if customer else []:
            backend_app.db.session.delete(cita)
        if customer2:
            for cita in backend_app.Cita.query.filter_by(cliente_id=customer2.id).all():
                backend_app.db.session.delete(cita)
        if vehicle:
            backend_app.db.session.delete(vehicle)
        if vehicle2:
            backend_app.db.session.delete(vehicle2)
        if customer:
            backend_app.db.session.delete(customer)
        if customer2:
            backend_app.db.session.delete(customer2)
        if service:
            backend_app.db.session.delete(service)
        if admin:
            backend_app.db.session.delete(admin)
        if user:
            backend_app.db.session.delete(user)
        if user2:
            backend_app.db.session.delete(user2)
        backend_app.db.session.commit()


def test_admin_citas_filters_by_client_vehicle_date_and_status():
    state = qa_cita_stage6()
    try:
        client = backend_app.app.test_client()
        create_1 = client.post(
            '/api/citas',
            headers={'Authorization': f'Bearer {state["user_token"]}', 'Content-Type': 'application/json'},
            json={
                'vehiculo_id': state['vehicle_id'],
                'servicio_id': state['service_id'],
                'fecha': '2027-06-10',
                'hora': '10:00:00',
                'motivo': 'Filtro QA 1',
                'observaciones': 'Obs 1',
            },
        )
        assert create_1.status_code == 201, create_1.get_data(as_text=True)

        create_2 = client.post(
            '/api/citas',
            headers={'Authorization': f'Bearer {state["user_token"]}', 'Content-Type': 'application/json'},
            json={
                'vehiculo_id': state['vehicle_id'],
                'servicio_id': state['service_id'],
                'fecha': '2027-06-11',
                'hora': '11:00:00',
                'motivo': 'Filtro QA 2',
                'observaciones': 'Obs 2',
            },
        )
        assert create_2.status_code == 201, create_2.get_data(as_text=True)

        response = client.get(
            '/api/admin/citas',
            headers={'Authorization': f'Bearer {state["admin_token"]}'},
            query_string={
                'cliente': 'Cita6 User',
                'vehiculo': 'Q6',
                'fecha': '2027-06-10',
                'estado': 'pendiente',
            },
        )
        assert response.status_code == 200, response.get_data(as_text=True)
        payload = response.get_json()['data']
        assert len(payload) == 1, payload
        assert payload[0]['fecha'] == '2027-06-10'
        assert payload[0]['estado'] == 'pendiente'
    finally:
        cleanup_cita_stage6(state)


def test_user_can_only_see_own_appointments():
    state = qa_cita_stage6()
    try:
        client = backend_app.app.test_client()
        first = client.post(
            '/api/citas',
            headers={'Authorization': f'Bearer {state["user_token"]}', 'Content-Type': 'application/json'},
            json={
                'vehiculo_id': state['vehicle_id'],
                'servicio_id': state['service_id'],
                'fecha': '2027-06-12',
                'hora': '09:00:00',
                'motivo': 'Propia',
            },
        )
        assert first.status_code == 201, first.get_data(as_text=True)

        other = client.post(
            '/api/citas',
            headers={'Authorization': f'Bearer {state["user2_token"]}', 'Content-Type': 'application/json'},
            json={
                'vehiculo_id': state['vehicle2_id'],
                'servicio_id': state['service_id'],
                'fecha': '2027-06-12',
                'hora': '09:30:00',
                'motivo': 'Ajena',
            },
        )
        assert other.status_code == 201, other.get_data(as_text=True)

        response = client.get(
            '/api/citas/mis-citas',
            headers={'Authorization': f'Bearer {state["user_token"]}'},
        )
        assert response.status_code == 200, response.get_data(as_text=True)
        data = response.get_json()['data']
        assert all(item['vehiculo']['placa'] == 'Q6' + state['prefix'][:5].upper() for item in data)
    finally:
        cleanup_cita_stage6(state)


def test_two_simultaneous_requests_cannot_book_same_slot():
    state = qa_cita_stage6()
    try:
        client = backend_app.app.test_client()
        payload = {
            'vehiculo_id': state['vehicle_id'],
            'servicio_id': state['service_id'],
            'fecha': '2027-06-13',
            'hora': '14:15:00',
            'motivo': 'Concurrente',
            'observaciones': 'QA',
        }

        def reserve(token):
            return client.post(
                '/api/citas',
                headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
                json=payload,
            )

        with ThreadPoolExecutor(max_workers=2) as executor:
            future_1 = executor.submit(reserve, state['user_token'])
            future_2 = executor.submit(reserve, state['user2_token'])
            r1 = future_1.result()
            r2 = future_2.result()

        statuses = {r1.status_code, r2.status_code}
        assert 201 in statuses, (r1.status_code, r2.status_code, r1.get_data(as_text=True), r2.get_data(as_text=True))
        assert 409 in statuses or len({r1.status_code, r2.status_code}) == 2, (r1.status_code, r2.status_code)

        with backend_app.app.app_context():
            created = backend_app.Cita.query.filter_by(
                fecha=backend_app.datetime.strptime('2027-06-13', '%Y-%m-%d').date(),
                hora=backend_app.datetime.strptime('14:15:00', '%H:%M:%S').time(),
            ).count()
        assert created == 1, created
    finally:
        cleanup_cita_stage6(state)
