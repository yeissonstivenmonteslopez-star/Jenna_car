import os
import sys
from decimal import Decimal

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import app as backend_app

backend_app.app.config['TESTING'] = True


def make_payment_state(prefix='histqa'):
    with backend_app.app.app_context():
        admin = backend_app.Usuario.query.filter_by(email=f'{prefix}_admin@jennacar.test').first()
        if not admin:
            admin = backend_app.Usuario(
                nombre='Hist',
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
                nombre='Hist',
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
                direccion='Calle Historial',
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
                problema_reportado='Problema de prueba para historial',
                estado='pendiente',
                subtotal=Decimal('450.00'),
                total=Decimal('450.00'),
            )
            backend_app.db.session.add(order)
            backend_app.db.session.flush()

        receipt = backend_app.Recibo.query.filter_by(orden_id=order.id).first()
        if not receipt:
            receipt = backend_app.Recibo(
                orden_id=order.id,
                cliente_id=customer.id,
                subtotal=Decimal('450.00'),
                total=Decimal('450.00'),
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


def test_user_can_get_own_payment_detail_and_history_fields():
    state = make_payment_state('hist1')
    try:
        client = backend_app.app.test_client()
        create = client.post(
            '/api/pagos',
            headers={'Authorization': f'Bearer {state["user_token"]}', 'Content-Type': 'application/json'},
            json={'recibo_id': state['receipt_id'], 'numero_nequi': '3001234567'}
        )
        payload = create.get_json()
        assert create.status_code == 201, payload
        pago_id = payload['data']['id']

        detail = client.get(f'/api/pagos/{pago_id}', headers={'Authorization': f'Bearer {state["user_token"]}'})
        detail_payload = detail.get_json()
        assert detail.status_code == 200, detail_payload
        assert detail_payload['data']['recibo_id'] == state['receipt_id']
        assert detail_payload['data']['orden_id'] == state['order_id']
        assert 'referencia' in detail_payload['data']
        assert 'monto' in detail_payload['data']
        assert 'metodo_pago' in detail_payload['data']
        assert 'estado' in detail_payload['data']
        assert 'fecha_pago' in detail_payload['data']

        history = client.get('/api/pagos/mis-pagos', headers={'Authorization': f'Bearer {state["user_token"]}'})
        history_payload = history.get_json()
        assert history.status_code == 200
        assert any(item['id'] == pago_id for item in history_payload['data'])
    finally:
        cleanup_payment_state(state)


def test_user_cannot_access_other_users_payment_detail():
    state = make_payment_state('hist2')
    try:
        client = backend_app.app.test_client()
        create = client.post(
            '/api/pagos',
            headers={'Authorization': f'Bearer {state["user_token"]}', 'Content-Type': 'application/json'},
            json={'recibo_id': state['receipt_id'], 'numero_nequi': '3001234567'}
        )
        pago_id = create.get_json()['data']['id']

        with backend_app.app.app_context():
            other_user = backend_app.Usuario(
                nombre='Otro',
                apellido='Usuario',
                email=f'{state["prefix"]}_other_{backend_app.secrets.token_hex(4)}@jennacar.test',
                password=backend_app.generate_password_hash('other123'),
                rol='usuario',
                estado='activo',
            )
            backend_app.db.session.add(other_user)
            backend_app.db.session.commit()
            other_token = backend_app.create_access_token(other_user)

        response = client.get(f'/api/pagos/{pago_id}', headers={'Authorization': f'Bearer {other_token}'})
        assert response.status_code in (403, 404)
    finally:
        cleanup_payment_state(state)


def test_admin_can_filter_pagos_by_reference_cliente_and_status():
    state = make_payment_state('hist3')
    try:
        client = backend_app.app.test_client()
        create = client.post(
            '/api/pagos',
            headers={'Authorization': f'Bearer {state["user_token"]}', 'Content-Type': 'application/json'},
            json={'recibo_id': state['receipt_id'], 'numero_nequi': '3001234567'}
        )
        payment = create.get_json()['data']

        list_response = client.get(
            '/api/admin/pagos',
            query_string={'referencia': payment['referencia'], 'estado': 'completado'},
            headers={'Authorization': f'Bearer {state["admin_token"]}'},
        )
        payload = list_response.get_json()
        assert list_response.status_code == 200
        assert any(item['id'] == payment['id'] for item in payload['data'])

        client_filter = client.get(
            '/api/admin/pagos',
            query_string={'cliente': 'Hist'},
            headers={'Authorization': f'Bearer {state["admin_token"]}'},
        )
        client_payload = client_filter.get_json()
        assert client_filter.status_code == 200
        assert any(item['id'] == payment['id'] for item in client_payload['data'])
    finally:
        cleanup_payment_state(state)
