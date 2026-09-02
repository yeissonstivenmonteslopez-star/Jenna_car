import os
import sys
from decimal import Decimal

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import app as backend_app

backend_app.app.config['TESTING'] = True


def make_payment_state(prefix='pagoqa'):
    with backend_app.app.app_context():
        admin = backend_app.Usuario.query.filter_by(email=f'{prefix}_admin@jennacar.test').first()
        if not admin:
            admin = backend_app.Usuario(
                nombre='Pago',
                apellido='Admin',
                email=f'{prefix}_admin@jennacar.test',
                password=backend_app.generate_password_hash('admin123'),
                rol='admin',
                estado='activo',
            )
            backend_app.db.session.add(admin)

        user = backend_app.Usuario.query.filter_by(email=f'{prefix}_user@jennacar.test').first()
        if not user:
            user = backend_app.Usuario(
                nombre='Pago',
                apellido='User',
                email=f'{prefix}_user@jennacar.test',
                password=backend_app.generate_password_hash('user123'),
                rol='usuario',
                estado='activo',
            )
            backend_app.db.session.add(user)

        customer = backend_app.Cliente.query.filter_by(documento=f'{prefix}-customer').first()
        if not customer:
            customer = backend_app.Cliente(
                usuario_id=user.id,
                documento=f'{prefix}-customer',
                direccion='Calle Pago',
                ciudad='Bogotá',
            )
            backend_app.db.session.add(customer)

        vehicle = backend_app.Vehiculo.query.filter_by(placa=f'{prefix[:7].upper()}').first()
        if not vehicle:
            vehicle = backend_app.Vehiculo(
                cliente_id=customer.id,
                placa=f'{prefix[:7].upper()}',
                marca='Mazda',
                modelo='CX-5',
                anio=2023,
                color='Azul',
                kilometraje=15000,
                tipo_combustible='gasolina',
                estado='activo',
            )
            backend_app.db.session.add(vehicle)

        order = backend_app.OrdenTrabajo.query.filter_by(id=999999 + abs(hash(prefix)) % 1000000).first()
        if not order:
            order = backend_app.OrdenTrabajo(
                cliente_id=customer.id,
                vehiculo_id=vehicle.id,
                fecha_ingreso=backend_app.datetime.now(backend_app.timezone.utc),
                problema_reportado='Problema de prueba para pago',
                estado='pendiente',
                subtotal=Decimal('350.00'),
                total=Decimal('350.00'),
            )
            backend_app.db.session.add(order)
            backend_app.db.session.flush()

        receipt = backend_app.Recibo.query.filter_by(orden_id=order.id).first()
        if not receipt:
            receipt = backend_app.Recibo(
                orden_id=order.id,
                cliente_id=customer.id,
                subtotal=Decimal('350.00'),
                total=Decimal('350.00'),
                descuento=Decimal('0.00'),
                estado='pendiente',
            )
            backend_app.db.session.add(receipt)

        backend_app.db.session.commit()

        admin_token = backend_app.create_access_token(backend_app.db.session.get(backend_app.Usuario, admin.id))
        user_token = backend_app.create_access_token(backend_app.db.session.get(backend_app.Usuario, user.id))
        return {
            'admin_token': admin_token,
            'user_token': user_token,
            'customer_id': customer.id,
            'order_id': order.id,
            'receipt_id': receipt.id,
            'prefix': prefix,
        }


def cleanup_payment_state(state):
    with backend_app.app.app_context():
        receipt = backend_app.db.session.get(backend_app.Recibo, state['receipt_id'])
        if receipt:
            backend_app.Pago.query.filter_by(recibo_id=receipt.id).delete(synchronize_session=False)
            backend_app.db.session.delete(receipt)

        order = backend_app.db.session.get(backend_app.OrdenTrabajo, state['order_id'])
        if order:
            backend_app.db.session.delete(order)

        customer = backend_app.db.session.get(backend_app.Cliente, state['customer_id'])
        if customer:
            backend_app.db.session.delete(customer)

        user = backend_app.Usuario.query.filter_by(email=f"{state['prefix']}_user@jennacar.test").first()
        admin = backend_app.Usuario.query.filter_by(email=f"{state['prefix']}_admin@jennacar.test").first()
        if user:
            backend_app.db.session.delete(user)
        if admin:
            backend_app.db.session.delete(admin)

        vehicle = backend_app.Vehiculo.query.filter_by(cliente_id=state['customer_id']).first()
        if vehicle:
            backend_app.db.session.delete(vehicle)

        backend_app.db.session.commit()


def test_user_can_create_simulated_payment_for_own_receipt():
    state = make_payment_state('sim1')
    try:
        client = backend_app.app.test_client()
        response = client.post(
            '/api/pagos',
            headers={'Authorization': f'Bearer {state["user_token"]}', 'Content-Type': 'application/json'},
            json={'recibo_id': state['receipt_id'], 'numero_nequi': '3001234567'}
        )
        payload = response.get_json()
        assert response.status_code == 201, payload
        assert payload['data']['simulacion'] is True
        assert payload['data']['metodo_pago'] == 'Nequi'
        assert payload['data']['estado'] == 'completado'
        assert payload['data']['referencia'].startswith('NEQUI-')
        assert 'numero_nequi' not in str(payload)
    finally:
        cleanup_payment_state(state)


def test_user_cannot_pay_other_users_receipt():
    state = make_payment_state('sim2')
    try:
        with backend_app.app.app_context():
            other_user_email = f'{state["prefix"]}_other_{backend_app.secrets.token_hex(4)}@jennacar.test'
            other_user = backend_app.Usuario(
                nombre='Otro',
                apellido='User',
                email=other_user_email,
                password=backend_app.generate_password_hash('other123'),
                rol='usuario',
                estado='activo',
            )
            backend_app.db.session.add(other_user)
            backend_app.db.session.commit()
            other_token = backend_app.create_access_token(other_user)

        client = backend_app.app.test_client()
        response = client.post(
            '/api/pagos',
            headers={'Authorization': f'Bearer {other_token}', 'Content-Type': 'application/json'},
            json={'recibo_id': state['receipt_id'], 'numero_nequi': '3001234567'}
        )
        assert response.status_code in (403, 404)
    finally:
        cleanup_payment_state(state)


def test_user_likes_to_see_my_payments():
    state = make_payment_state('sim3')
    try:
        client = backend_app.app.test_client()
        create = client.post(
            '/api/pagos',
            headers={'Authorization': f'Bearer {state["user_token"]}', 'Content-Type': 'application/json'},
            json={'recibo_id': state['receipt_id'], 'numero_nequi': '3001234567'}
        )
        assert create.status_code == 201

        list_response = client.get('/api/pagos/mis-pagos', headers={'Authorization': f'Bearer {state["user_token"]}'})
        payload = list_response.get_json()
        assert list_response.status_code == 200
        assert any(item['recibo_id'] == state['receipt_id'] for item in payload['data'])
    finally:
        cleanup_payment_state(state)


def test_admin_can_list_all_pagos():
    state = make_payment_state('sim4')
    try:
        client = backend_app.app.test_client()
        create = client.post(
            '/api/pagos',
            headers={'Authorization': f'Bearer {state["user_token"]}', 'Content-Type': 'application/json'},
            json={'recibo_id': state['receipt_id'], 'numero_nequi': '3001234567'}
        )
        assert create.status_code == 201

        response = client.get('/api/admin/pagos', headers={'Authorization': f'Bearer {state["admin_token"]}'})
        payload = response.get_json()
        assert response.status_code == 200
        assert any(item['recibo_id'] == state['receipt_id'] for item in payload['data'])
    finally:
        cleanup_payment_state(state)


def test_admin_can_get_single_payment():
    state = make_payment_state('sim5')
    try:
        client = backend_app.app.test_client()
        create = client.post(
            '/api/pagos',
            headers={'Authorization': f'Bearer {state["user_token"]}', 'Content-Type': 'application/json'},
            json={'recibo_id': state['receipt_id'], 'numero_nequi': '3001234567'}
        )
        pago_id = create.get_json()['data']['id']

        response = client.get(f'/api/admin/pagos/{pago_id}', headers={'Authorization': f'Bearer {state["admin_token"]}'})
        payload = response.get_json()
        assert response.status_code == 200
        assert payload['data']['id'] == pago_id
        assert payload['data']['metodo_pago'] == 'Nequi'
    finally:
        cleanup_payment_state(state)


def test_simulated_payment_marks_receipt_as_pagado():
    state = make_payment_state('sim6')
    try:
        client = backend_app.app.test_client()
        response = client.post(
            '/api/pagos',
            headers={'Authorization': f'Bearer {state["user_token"]}', 'Content-Type': 'application/json'},
            json={'recibo_id': state['receipt_id'], 'numero_nequi': '3001234567'}
        )
        assert response.status_code == 201
        with backend_app.app.app_context():
            receipt = backend_app.db.session.get(backend_app.Recibo, state['receipt_id'])
            assert receipt.estado == 'pagado'
    finally:
        cleanup_payment_state(state)
