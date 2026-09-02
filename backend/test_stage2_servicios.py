import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import app as backend_app

backend_app.app.config['TESTING'] = True


def qa_service_state(prefix=None):
    prefix = prefix or uuid.uuid4().hex[:8]
    admin_email = f'service_admin_{prefix}@jennacar.test'
    user_email = f'service_user_{prefix}@jennacar.test'
    doc = f'SVC-{prefix}'

    with backend_app.app.app_context():
        admin = backend_app.Usuario.query.filter_by(email=admin_email).first()
        if not admin:
            admin = backend_app.Usuario(
                nombre='Service',
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
                nombre='Service',
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
                direccion='Servicio QA',
                ciudad='Bogotá',
            )
            backend_app.db.session.add(customer)
            backend_app.db.session.flush()

        backend_app.db.session.commit()

        admin_token = backend_app.create_access_token(backend_app.db.session.get(backend_app.Usuario, admin.id))
        user_token = backend_app.create_access_token(backend_app.db.session.get(backend_app.Usuario, user.id))

        return {
            'prefix': prefix,
            'admin_token': admin_token,
            'user_token': user_token,
            'customer_id': customer.id,
        }


def cleanup_service_qa(state):
    if not state:
        return
    with backend_app.app.app_context():
        admin = backend_app.Usuario.query.filter_by(email=f"service_admin_{state['prefix']}@jennacar.test").first()
        user = backend_app.Usuario.query.filter_by(email=f"service_user_{state['prefix']}@jennacar.test").first()
        customer = backend_app.Cliente.query.filter_by(documento=f"SVC-{state['prefix']}").first()

        if customer:
            customer_vehicle_ids = [vehicle.id for vehicle in backend_app.Vehiculo.query.filter_by(cliente_id=customer.id).all()]
            if customer_vehicle_ids:
                backend_app.OrdenServicio.query.filter(backend_app.OrdenServicio.orden_id.in_(
                    backend_app.db.session.query(backend_app.OrdenTrabajo.id).filter(backend_app.OrdenTrabajo.vehiculo_id.in_(customer_vehicle_ids))
                )).delete(synchronize_session=False)
                backend_app.OrdenTrabajo.query.filter(backend_app.OrdenTrabajo.vehiculo_id.in_(customer_vehicle_ids)).delete(synchronize_session=False)
                backend_app.Cita.query.filter(backend_app.Cita.vehiculo_id.in_(customer_vehicle_ids)).delete(synchronize_session=False)
                backend_app.Vehiculo.query.filter_by(cliente_id=customer.id).delete(synchronize_session=False)
            backend_app.Cita.query.filter_by(cliente_id=customer.id).delete(synchronize_session=False)
            backend_app.db.session.delete(customer)

        if admin:
            backend_app.db.session.delete(admin)
        if user:
            backend_app.db.session.delete(user)
        backend_app.db.session.commit()


def test_admin_can_list_services():
    state = qa_service_state()
    try:
        client = backend_app.app.test_client()
        response = client.get('/api/admin/servicios', headers={'Authorization': f'Bearer {state["admin_token"]}'})
        assert response.status_code == 200
        payload = response.get_json()
        assert 'data' in payload
        assert isinstance(payload['data'], list)
    finally:
        cleanup_service_qa(state)


def test_admin_can_create_service():
    state = qa_service_state()
    try:
        client = backend_app.app.test_client()
        response = client.post(
            '/api/admin/servicios',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'nombre': f'QA Service {state["prefix"]}',
                'descripcion': 'Servicio QA',
                'precio': 150.00,
                'duracion_estimada': 60,
                'estado': 'activo',
            },
        )
        assert response.status_code == 201
        payload = response.get_json()['data']
        assert payload['nombre'] == f'QA Service {state["prefix"]}'
    finally:
        cleanup_service_qa(state)


def test_duplicate_service_name_is_rejected():
    state = qa_service_state()
    try:
        client = backend_app.app.test_client()
        name = f'QA Duplicate {state["prefix"]}'
        client.post(
            '/api/admin/servicios',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'nombre': name,
                'descripcion': 'Primero',
                'precio': 120.00,
                'duracion_estimada': 45,
                'estado': 'activo',
            },
        )
        response = client.post(
            '/api/admin/servicios',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'nombre': name.lower(),
                'descripcion': 'Segundo',
                'precio': 170.00,
                'duracion_estimada': 80,
                'estado': 'activo',
            },
        )
        assert response.status_code == 409
        assert 'nombre' in response.get_json()['error'].lower()
    finally:
        cleanup_service_qa(state)


def test_invalid_price_and_status_are_rejected():
    state = qa_service_state()
    try:
        client = backend_app.app.test_client()
        response = client.post(
            '/api/admin/servicios',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'nombre': f'QA Invalid {state["prefix"]}',
                'descripcion': 'bad',
                'precio': -5,
                'duracion_estimada': 30,
                'estado': 'pendiente',
            },
        )
        assert response.status_code in {400, 409}
    finally:
        cleanup_service_qa(state)


def test_non_admin_gets_403():
    state = qa_service_state()
    try:
        client = backend_app.app.test_client()
        response = client.get('/api/admin/servicios', headers={'Authorization': f'Bearer {state["user_token"]}'})
        assert response.status_code == 403
    finally:
        cleanup_service_qa(state)


def test_delete_with_relations_desactivates_service():
    state = qa_service_state()
    try:
        client = backend_app.app.test_client()
        create_response = client.post(
            '/api/admin/servicios',
            headers={'Authorization': f'Bearer {state["admin_token"]}', 'Content-Type': 'application/json'},
            json={
                'nombre': f'QA Related {state["prefix"]}',
                'descripcion': 'Related service',
                'precio': 200.00,
                'duracion_estimada': 90,
                'estado': 'activo',
            },
        )
        service_id = create_response.get_json()['data']['id']

        with backend_app.app.app_context():
            service = backend_app.db.session.get(backend_app.Servicio, service_id)
            vehicle = backend_app.Vehiculo(
                cliente_id=state['customer_id'],
                placa=f'REL{state["prefix"][:5]}',
                marca='Marca',
                modelo='Modelo',
                anio=2024,
                color='Negro',
                kilometraje=5000,
                tipo_combustible='gasolina',
                estado='activo',
            )
            backend_app.db.session.add(vehicle)
            backend_app.db.session.flush()

            order = backend_app.OrdenTrabajo(
                cliente_id=state['customer_id'],
                vehiculo_id=vehicle.id,
                problema_reportado='Servicio QA',
                estado='pendiente',
                subtotal=200.00,
                total=200.00,
            )
            backend_app.db.session.add(order)
            backend_app.db.session.flush()

            backend_app.db.session.add(
                backend_app.OrdenServicio(
                    orden_id=order.id,
                    servicio_id=service.id,
                    cantidad=1,
                    precio=200.00,
                    subtotal=200.00,
                )
            )
            backend_app.db.session.commit()

        delete_response = client.delete(f'/api/admin/servicios/{service_id}', headers={'Authorization': f'Bearer {state["admin_token"]}'})
        assert delete_response.status_code == 200
        data = delete_response.get_json()
        assert data['data']['estado'] == 'inactivo'
    finally:
        cleanup_service_qa(state)
