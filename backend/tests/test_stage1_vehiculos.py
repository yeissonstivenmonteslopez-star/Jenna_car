import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import app as backend_app

backend_app.app.config['TESTING'] = True


def qa_state(prefix=None):
    prefix = prefix or uuid.uuid4().hex[:8]
    admin_email = f'qa_admin_{prefix}@jennacar.test'
    user_email = f'qa_user_{prefix}@jennacar.test'
    document = f'QA-{prefix}'
    char = chr(65 + (hash(prefix) % 26))
    num = 100 + (abs(hash(prefix)) % 800)
    plate = f'Q{char}A{num}'

    with backend_app.app.app_context():
        admin = backend_app.Usuario.query.filter_by(email=admin_email).first()
        if not admin:
            admin = backend_app.Usuario(
                nombre='QA',
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
                nombre='QA',
                apellido='User',
                email=user_email,
                password=backend_app.generate_password_hash('user123'),
                rol='usuario',
                estado='activo',
            )
            backend_app.db.session.add(user)
            backend_app.db.session.flush()

        customer = backend_app.Cliente.query.filter_by(documento=document).first()
        if not customer:
            customer = backend_app.Cliente(
                usuario_id=user.id,
                documento=document,
                direccion='QA direccion',
                ciudad='Bogotá',
            )
            backend_app.db.session.add(customer)
            backend_app.db.session.flush()

        backend_app.db.session.commit()

        admin_id = admin.id
        user_id = user.id
        customer_id = customer.id
        admin_token = backend_app.create_access_token(backend_app.db.session.get(backend_app.Usuario, admin_id))
        user_token = backend_app.create_access_token(backend_app.db.session.get(backend_app.Usuario, user_id))

        return {
            'prefix': prefix,
            'admin_token': admin_token,
            'user_token': user_token,
            'client_id': customer_id,
            'document': document,
            'plate': plate,
        }


def cleanup_qa(state):
    if not state:
        return
    with backend_app.app.app_context():
        admin = backend_app.Usuario.query.filter_by(email=f"qa_admin_{state['prefix']}@jennacar.test").first()
        user = backend_app.Usuario.query.filter_by(email=f"qa_user_{state['prefix']}@jennacar.test").first()
        customer = backend_app.Cliente.query.filter_by(documento=state['document']).first()

        if customer:
            backend_app.Cita.query.filter_by(cliente_id=customer.id).delete()
            backend_app.Vehiculo.query.filter_by(cliente_id=customer.id).delete()
            backend_app.db.session.delete(customer)

        if admin:
            backend_app.db.session.delete(admin)
        if user:
            backend_app.db.session.delete(user)
        backend_app.db.session.commit()


def test_admin_can_list_vehicles():
    state = qa_state()
    try:
        client = backend_app.app.test_client()
        response = client.get('/api/admin/vehiculos', headers={'Authorization': f'Bearer {state["admin_token"]}'})
        assert response.status_code == 200
        data = response.get_json()['data']
        assert isinstance(data, list)
    finally:
        cleanup_qa(state)


def test_admin_can_create_vehicle():
    state = qa_state()
    try:
        client = backend_app.app.test_client()
        response = client.post(
            '/api/admin/vehiculos',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'cliente_id': state['client_id'],
                'placa': f"{state['plate'][:3]}101",
                'marca': 'Toyota',
                'modelo': 'Corolla',
                'anio': 2022,
                'color': 'Blanco',
                'kilometraje': 15000,
                'tipo_combustible': 'gasolina',
                'estado': 'activo',
            },
        )
        assert response.status_code == 201
        payload = response.get_json()['data']
        assert payload['placa'] == f"{state['plate'][:3]}101"
    finally:
        cleanup_qa(state)


def test_duplicate_plate_is_rejected():
    state = qa_state()
    try:
        client = backend_app.app.test_client()
        first_plate = f"{state['plate'][:3]}102"
        client.post(
            '/api/admin/vehiculos',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'cliente_id': state['client_id'],
                'placa': first_plate,
                'marca': 'Mazda',
                'modelo': '3',
                'kilometraje': 1200,
                'tipo_combustible': 'gasolina',
                'estado': 'activo',
            },
        )
        response = client.post(
            '/api/admin/vehiculos',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'cliente_id': state['client_id'],
                'placa': first_plate.lower(),
                'marca': 'Honda',
                'modelo': 'Civic',
                'kilometraje': 1500,
                'tipo_combustible': 'gasolina',
                'estado': 'activo',
            },
        )
        assert response.status_code == 409
        assert 'placa' in response.get_json()['error'].lower()
    finally:
        cleanup_qa(state)


def test_invalid_kilometraje_is_rejected():
    state = qa_state()
    try:
        client = backend_app.app.test_client()
        response = client.post(
            '/api/admin/vehiculos',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'cliente_id': state['client_id'],
                'placa': f"{state['plate'][:3]}103",
                'marca': 'Renault',
                'modelo': 'Clio',
                'kilometraje': -1,
                'tipo_combustible': 'gasolina',
                'estado': 'activo',
            },
        )
        assert response.status_code == 400
        assert 'kilometraje' in response.get_json()['error'].lower()
    finally:
        cleanup_qa(state)


def test_plate_must_have_three_letters_and_three_digits():
    state = qa_state()
    try:
        client = backend_app.app.test_client()
        response = client.post(
            '/api/admin/vehiculos',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'cliente_id': state['client_id'],
                'placa': 'AB12C',
                'marca': 'Renault',
                'modelo': 'Clio',
                'kilometraje': 1234,
                'tipo_combustible': 'gasolina',
                'estado': 'activo',
            },
        )
        assert response.status_code == 400
        assert 'placa' in response.get_json()['error'].lower()
    finally:
        cleanup_qa(state)


def test_non_admin_gets_403():
    state = qa_state()
    try:
        client = backend_app.app.test_client()
        response = client.get('/api/admin/vehiculos', headers={'Authorization': f'Bearer {state["user_token"]}'})
        assert response.status_code == 403
    finally:
        cleanup_qa(state)


def test_no_token_gets_401():
    state = qa_state()
    try:
        client = backend_app.app.test_client()
        response = client.get('/api/admin/vehiculos')
        assert response.status_code == 401
    finally:
        cleanup_qa(state)


def test_delete_with_relations_desactivates_vehicle():
    state = qa_state()
    try:
        client = backend_app.app.test_client()
        created = client.post(
            '/api/admin/vehiculos',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'cliente_id': state['client_id'],
                'placa': f"{state['plate'][:3]}104",
                'marca': 'Ford',
                'modelo': 'Focus',
                'kilometraje': 2000,
                'tipo_combustible': 'diesel',
                'estado': 'activo',
            },
        )
        vehicle_id = created.get_json()['data']['id']

        with backend_app.app.app_context():
            vehicle = backend_app.db.session.get(backend_app.Vehiculo, vehicle_id)
            servicio = backend_app.Servicio.query.filter_by(nombre='Mantenimiento').first()
            if not servicio:
                servicio = backend_app.Servicio(nombre='Mantenimiento', descripcion='QA service', precio=50, duracion_estimada=60, estado='activo')
                backend_app.db.session.add(servicio)
                backend_app.db.session.commit()
            backend_app.db.session.add(
                backend_app.Cita(
                    cliente_id=state['client_id'],
                    vehiculo_id=vehicle.id,
                    servicio_id=servicio.id,
                    fecha=backend_app.datetime.strptime('2026-10-10', '%Y-%m-%d').date(),
                    hora=backend_app.datetime.strptime('10:00:00', '%H:%M:%S').time(),
                    motivo='Prueba QA',
                    estado='pendiente',
                )
            )
            backend_app.db.session.commit()

        response = client.delete(f'/api/admin/vehiculos/{vehicle_id}', headers={'Authorization': f'Bearer {state["admin_token"]}'})
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['estado'] == 'inactivo'
    finally:
        cleanup_qa(state)
