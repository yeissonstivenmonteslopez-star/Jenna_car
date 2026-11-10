import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import app as backend_app
from app.services import citas_s as appointment_service


backend_app.app.config['TESTING'] = True


def test_same_client_same_time_is_blocked():
    with backend_app.app.app_context():
        unique = os.urandom(4).hex()
        user = backend_app.Usuario(
            nombre='Cliente',
            apellido='Duplicado',
            email=f'cliente_dup_{unique}@test.local',
            password=backend_app.generate_password_hash('secret123'),
            rol='usuario',
            estado='activo',
        )
        backend_app.db.session.add(user)
        backend_app.db.session.flush()

        vehicle = backend_app.Vehiculo(
            cliente_id=user.id,
            placa=f'DUP{unique[:5].upper()}',
            marca='Toyota',
            modelo='Corolla',
            anio=2024,
            color='Rojo',
            kilometraje=10000,
            tipo_combustible='gasolina',
            estado='activo',
        )
        backend_app.db.session.add(vehicle)
        backend_app.db.session.flush()

        service = backend_app.Servicio(
            nombre=f'Servicio duplicado {unique}',
            descripcion='Servicio QA',
            precio=100.00,
            duracion_estimada=60,
            estado='activo',
        )
        backend_app.db.session.add(service)
        backend_app.db.session.flush()

        cita = backend_app.Cita(
            vehiculo_id=vehicle.id,
            servicio_id=service.id,
            fecha='2027-05-20',
            hora='10:00:00',
            motivo='Revisión',
            observaciones='QA',
            estado='confirmada',
        )
        backend_app.db.session.add(cita)
        backend_app.db.session.commit()

        assert appointment_service.occupied(cita.fecha, cita.hora, cliente_id=user.id)

        backend_app.db.session.delete(cita)
        backend_app.db.session.delete(vehicle)
        backend_app.db.session.delete(service)
        backend_app.db.session.delete(user)
        backend_app.db.session.commit()
