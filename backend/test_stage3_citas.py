import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import app as backend_app

backend_app.app.config['TESTING'] = True


def qa_cita_state(prefix=None):
    prefix = prefix or uuid.uuid4().hex[:8]
    admin_email = f'cita_admin_{prefix}@jennacar.test'
    user_email = f'cita_user_{prefix}@jennacar.test'
    doc = f'CIT-{prefix}'

    with backend_app.app.app_context():
        admin = backend_app.Usuario.query.filter_by(email=admin_email).first()
        if not admin:
            admin = backend_app.Usuario(
                nombre='Cita',
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
                nombre='Cita',
                apellido='User',
                email=user_email,
                password=backend_app.generate_password_hash('user123'),
                rol='usuario',
                estado='activo',
            )
            backend_app.db.session.add(user)
            backend_app.db.session.flush()

        customer = backend_app.Cliente.query.filter_by(documento=doc).first()
        if not customer:
            customer = backend_app.Cliente(
                usuario_id=user.id,
                documento=doc,
                direccion='Cita QA',
                ciudad='Bogotá',
            )
            backend_app.db.session.add(customer)
            backend_app.db.session.flush()

        vehicle = backend_app.Vehiculo.query.filter_by(placa=f'QA{prefix[:5].upper()}').first()
        if not vehicle:
            vehicle = backend_app.Vehiculo(
                cliente_id=customer.id,
                placa=f'QA{prefix[:5].upper()}',
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

        service = backend_app.Servicio.query.filter_by(nombre=f'QA Service {prefix}').first()
        if not service:
            service = backend_app.Servicio(
                nombre=f'QA Service {prefix}',
                descripcion='Servicio QA',
                precio=150.00,
                duracion_estimada=60,
                estado='activo',
            )
            backend_app.db.session.add(service)
            backend_app.db.session.flush()

        backend_app.db.session.commit()
        admin_token = backend_app.create_access_token(backend_app.db.session.get(backend_app.Usuario, admin.id))
        user_token = backend_app.create_access_token(backend_app.db.session.get(backend_app.Usuario, user.id))

        return {
            'prefix': prefix,
            'admin_token': admin_token,
            'user_token': user_token,
            'customer_id': customer.id,
            'vehicle_id': vehicle.id,
            'service_id': service.id,
        }


def cleanup_cita_qa(state):
    if not state:
        return
    with backend_app.app.app_context():
        admin = backend_app.Usuario.query.filter_by(email=f"cita_admin_{state['prefix']}@jennacar.test").first()
        user = backend_app.Usuario.query.filter_by(email=f"cita_user_{state['prefix']}@jennacar.test").first()
        customer = backend_app.Cliente.query.filter_by(documento=f"CIT-{state['prefix']}").first()
        vehicle = backend_app.Vehiculo.query.filter_by(placa=f"QA{state['prefix'][:5].upper()}").first()
        service = backend_app.Servicio.query.filter_by(nombre=f"QA Service {state['prefix']}").first()

        if customer:
            backend_app.Cita.query.filter_by(cliente_id=customer.id).delete(synchronize_session=False)
            if vehicle:
                backend_app.Vehiculo.query.filter_by(id=vehicle.id).delete(synchronize_session=False)
            if service:
                backend_app.OrdenServicio.query.filter_by(servicio_id=service.id).delete(synchronize_session=False)
            backend_app.db.session.delete(customer)

        if admin:
            backend_app.db.session.delete(admin)
        if user:
            backend_app.db.session.delete(user)
        backend_app.db.session.commit()


def test_admin_can_list_citas():
    state = qa_cita_state()
    try:
        client = backend_app.app.test_client()
        response = client.get('/api/admin/citas', headers={'Authorization': f'Bearer {state["admin_token"]}'})
        assert response.status_code == 200
        payload = response.get_json()
        assert 'data' in payload
        assert isinstance(payload['data'], list)
    finally:
        cleanup_cita_qa(state)


def test_admin_can_create_appointment():
    state = qa_cita_state()
    try:
        client = backend_app.app.test_client()
        response = client.post(
            '/api/admin/citas',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'cliente_id': state['customer_id'],
                'vehiculo_id': state['vehicle_id'],
                'servicio_id': state['service_id'],
                'fecha': '2027-05-10',
                'hora': '10:30:00',
                'motivo': 'Prueba QA',
                'observaciones': 'Observación QA',
                'estado': 'pendiente',
            },
        )
        assert response.status_code == 201
        payload = response.get_json()['data']
        assert payload['servicio']['id'] == state['service_id']
    finally:
        cleanup_cita_qa(state)


def test_admin_can_update_appointment():
    state = qa_cita_state()
    try:
        client = backend_app.app.test_client()
        create_response = client.post(
            '/api/admin/citas',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'cliente_id': state['customer_id'],
                'vehiculo_id': state['vehicle_id'],
                'servicio_id': state['service_id'],
                'fecha': '2027-05-11',
                'hora': '11:00:00',
                'motivo': 'Original',
                'estado': 'pendiente',
            },
        )
        cita_id = create_response.get_json()['data']['id']

        update_response = client.put(
            f'/api/admin/citas/{cita_id}',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'motivo': 'Editado QA',
                'estado': 'confirmada',
            },
        )
        assert update_response.status_code == 200
        assert update_response.get_json()['data']['motivo'] == 'Editado QA'
    finally:
        cleanup_cita_qa(state)


def test_non_admin_gets_403():
    state = qa_cita_state()
    try:
        client = backend_app.app.test_client()
        response = client.get('/api/admin/citas', headers={'Authorization': f'Bearer {state["user_token"]}'})
        assert response.status_code == 403
    finally:
        cleanup_cita_qa(state)


def test_appointment_after_7pm_is_rejected():
    state = qa_cita_state()
    try:
        client = backend_app.app.test_client()
        response = client.post(
            '/api/citas',
            headers={'Authorization': f'Bearer {state["user_token"]}', 'Content-Type': 'application/json'},
            json={
                'vehiculo_id': state['vehicle_id'],
                'servicio_id': state['service_id'],
                'fecha': '2027-05-13',
                'hora': '19:30:00',
                'motivo': 'Prueba de horario',
            },
        )
        assert response.status_code == 400
        assert '7' in response.get_json()['error'] or '19:00' in response.get_json()['error']
    finally:
        cleanup_cita_qa(state)


def test_invalid_state_is_rejected():
    state = qa_cita_state()
    try:
        client = backend_app.app.test_client()
        response = client.post(
            '/api/admin/citas',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'cliente_id': state['customer_id'],
                'vehiculo_id': state['vehicle_id'],
                'servicio_id': state['service_id'],
                'fecha': '2027-05-12',
                'hora': '09:00:00',
                'motivo': 'Estado inválido',
                'estado': 'invalido',
            },
        )
        assert response.status_code == 400
    finally:
        cleanup_cita_qa(state)


def test_delete_appointment_removes_record():
    state = qa_cita_state()
    try:
        client = backend_app.app.test_client()
        created = client.post(
            '/api/admin/citas',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'cliente_id': state['customer_id'],
                'vehiculo_id': state['vehicle_id'],
                'servicio_id': state['service_id'],
                'fecha': '2027-05-13',
                'hora': '12:15:00',
                'motivo': 'Borrar QA',
                'estado': 'pendiente',
            },
        )
        cita_id = created.get_json()['data']['id']

        response = client.delete(f'/api/admin/citas/{cita_id}', headers={'Authorization': f'Bearer {state["admin_token"]}'})
        assert response.status_code == 200
        assert response.get_json()['message'] == 'Cita eliminada correctamente.'
    finally:
        cleanup_cita_qa(state)


def test_client_can_create_vehicle_and_appointment():
    prefix = uuid.uuid4().hex[:8]
    user_email = f'client_booking_{prefix}@jennacar.test'
    with backend_app.app.app_context():
        user = backend_app.Usuario.query.filter_by(email=user_email).first()
        if not user:
            user = backend_app.Usuario(
                nombre='Cliente',
                apellido='Booking',
                email=user_email,
                password=backend_app.generate_password_hash('user123'),
                rol='usuario',
                estado='activo',
            )
            backend_app.db.session.add(user)
            backend_app.db.session.flush()
            backend_app.db.session.add(backend_app.Cliente(usuario_id=user.id, documento=f'BOOK-{prefix}'))
            backend_app.db.session.commit()
        servicio = backend_app.Servicio.query.filter_by(nombre='Mantenimiento general').first()
        if not servicio:
            servicio = backend_app.Servicio(
                nombre='Mantenimiento general',
                descripcion='Servicio de mantenimiento',
                precio=120.00,
                duracion_estimada=60,
                estado='activo',
            )
            backend_app.db.session.add(servicio)
            backend_app.db.session.commit()
        token = backend_app.create_access_token(user)
        service_id = servicio.id

    client = backend_app.app.test_client()
    response = client.post(
        '/api/vehiculos',
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        json={
            'placa': f"BKK{100 + (abs(hash(prefix)) % 800)}",
            'marca': 'Toyota',
            'modelo': 'Corolla',
            'anio': 2024,
            'color': 'Negro',
            'tipo_combustible': 'gasolina',
            'kilometraje': 12000,
        },
    )
    assert response.status_code == 201, response.get_data(as_text=True)
    vehicle_id = response.get_json()['data']['id']

    response = client.post(
        '/api/citas',
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        json={
            'vehiculo_id': vehicle_id,
            'servicio_id': service_id,
            'fecha': '2027-06-10',
            'hora': '10:30:00',
            'motivo': 'Prueba de reserva del cliente',
        },
    )
    assert response.status_code == 201, response.get_data(as_text=True)
    payload = response.get_json()['data']
    assert payload['vehiculo_id'] == vehicle_id

    with backend_app.app.app_context():
        created = backend_app.Cliente.query.filter_by(documento=f'BOOK-{prefix}').first()
        if created:
            backend_app.Cita.query.filter_by(cliente_id=created.id).delete(synchronize_session=False)
            backend_app.Vehiculo.query.filter_by(cliente_id=created.id).delete(synchronize_session=False)
            backend_app.db.session.delete(created)
        user = backend_app.Usuario.query.filter_by(email=user_email).first()
        if user:
            backend_app.db.session.delete(user)
        backend_app.db.session.commit()
