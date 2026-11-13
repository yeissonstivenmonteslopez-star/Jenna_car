"""No DB connections, DDL, SMTP deliveries or provider requests are made here."""
from datetime import date, datetime, time
from decimal import Decimal
from io import BytesIO
from pathlib import Path
import sys
from types import SimpleNamespace as NS
from unittest.mock import MagicMock

import pytest
from flask import Flask
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services import appointment_slots as slots
from app.services import pagos_s as payments
from app.services import repair_updates as repairs


def query(rows=(), first=None):
    q = MagicMock()
    for method in ('filter', 'filter_by', 'order_by', 'with_for_update', 'populate_existing', 'options', 'join'):
        getattr(q, method).return_value = q
    q.all.return_value = list(rows)
    q.first.return_value = first
    return q


@pytest.fixture
def calendar(monkeypatch):
    monkeypatch.setattr(slots, 'column_exists', lambda *args: False)
    appointments = query()
    mechanics = query([NS(id=10), NS(id=11)])
    monkeypatch.setattr(slots, 'Cita', NS(query=appointments, fecha=MagicMock(), id=MagicMock()))
    monkeypatch.setattr(slots, 'Usuario', NS(query=mechanics, id=MagicMock()))
    database = MagicMock()
    database.session.get.return_value = NS(duracion_estimada=90)
    monkeypatch.setattr(slots, 'db', database)
    monkeypatch.setattr(slots, 'now_local', lambda: datetime(2030, 1, 1, 9))
    return appointments, mechanics, database


def appointment(mechanic=10, hour=10, duration=90, state='pendiente', vehicle=1):
    return NS(id=1, fecha=date(2030, 1, 2), hora=time(hour), estado=state,
              mecanico_id=mechanic, vehiculo_id=vehicle, servicio=NS(duracion_estimada=duration))


def test_overlap_reserves_only_one_mechanic(calendar):
    calendar[0].all.return_value = [appointment()]
    assert slots.slot_status(date(2030, 1, 2), time(11), 1, 2) == (True, 11)
    assert slots.slot_status(date(2030, 1, 2), time(11), 1, 1)[0] is False


def test_workshop_full_with_two_mechanics(calendar):
    calendar[0].all.return_value = [appointment(), appointment(11, vehicle=2)]
    assert slots.slot_status(date(2030, 1, 2), time(11), 1, 3)[0] is False


def test_legacy_unassigned_appointment_uses_capacity(calendar):
    calendar[0].all.return_value = [appointment(None), appointment(10, vehicle=2)]
    assert not slots.slot_status(date(2030, 1, 2), time(11), 1, 3)[0]


def test_cancelled_releases_capacity_without_deleting_row(calendar):
    calendar[0].all.return_value = [appointment(state='cancelada')]
    assert slots.slot_status(date(2030, 1, 2), time(10), 1, 2)[0]
    assert not slots.slot_status(date(2030, 1, 2), time(10), 1, 1)[0]  # existing unique key


def test_migrated_cancelled_row_allows_same_vehicle_and_mechanic(calendar, monkeypatch):
    monkeypatch.setattr(slots, 'column_exists', lambda *args: True)
    calendar[0].all.return_value = [appointment(state='cancelada')]
    assert slots.slot_status(date(2030, 1, 2), time(10), 1, 1, 10) == (True, 10)


def test_non_overlapping_boundary_is_free(calendar):
    calendar[0].all.return_value = [appointment(duration=60)]
    assert slots.slot_status(date(2030, 1, 2), time(11), 1, 1)[0]


@pytest.mark.parametrize('day,hour', [(date(2029, 1, 1), time(10)), (date(2030, 1, 1), time(8)), (date(2030, 1, 2), time(7)), (date(2030, 1, 2), time(18)), (date(2030, 1, 2), time(10, 30))])
def test_past_outside_hours_and_duration_overrun(calendar, day, hour):
    assert not slots.slot_status(day, hour, 1)[0]


def test_booking_mutex_and_current_reads(calendar):
    appointments, mechanics, database = calendar
    mechanics.first.return_value = NS(id=1)
    @slots.serialize_booking
    def reserve():
        available = slots.slot_status(date(2030, 1, 2), time(10), 1, locking=True)[0]
        database.session.commit()
        return available, None, 201
    assert reserve() == (True, None, 201)
    mechanics.with_for_update.assert_called()
    appointments.with_for_update.assert_called_once()
    database.session.commit.assert_called_once()


@pytest.fixture
def checkout(monkeypatch):
    receipt = NS(id=2, orden_id=3, cliente_id=7, total=Decimal('15000.00'), estado='pendiente', enviado_cliente=True)
    q = query(first=receipt)
    def owned_filter(*conditions):
        q.first.return_value = receipt if conditions[1].right.value == receipt.cliente_id else None
        return q
    q.filter.side_effect = owned_filter
    monkeypatch.setattr(payments, 'Recibo', NS(query=q, id=MagicMock(), orden_trabajo=MagicMock()))
    from app.services import schema_compat
    monkeypatch.setattr(schema_compat, 'optional_read', lambda *args: [])
    db = MagicMock()
    db.text.side_effect = lambda value: value
    db.session.execute.return_value.mappings.return_value.first.return_value = None
    db.session.execute.return_value.first.return_value = None
    db.session.execute.return_value.lastrowid = 23
    monkeypatch.setattr(payments, 'db', db)
    provider = MagicMock(side_effect=AssertionError('No provider calls allowed'))
    monkeypatch.setattr(payments, 'mp_api', provider)
    payload = dict(recibo_id=2, metodo='tarjeta', franquicia='visa', resultado='aprobado', idempotencia='test-request-123456789')
    return receipt, db, payload


@pytest.mark.parametrize('outcome,state,receipt_state', [('aprobado', 'completado', 'pagado'), ('rechazado', 'anulado', 'pendiente'), ('pendiente', 'pendiente', 'pendiente')])
@pytest.mark.parametrize('method', ['tarjeta', 'nequi'])
def test_checkout_results_and_server_amount(checkout, outcome, state, receipt_state, method):
    receipt, db, payload = checkout
    payload.update(resultado=outcome, metodo=method)
    data, error, status = payments.simulate_checkout(NS(id=7), payload)
    assert error is None and status == 201
    assert data['monto'] == 15000 and data['estado'] == state
    assert receipt.estado == receipt_state and data['simulacion']
    insert, values = db.session.execute.call_args.args
    assert 'INSERT INTO pagos' in insert and values['metodo_pago'] == method
    assert set(values) == {'recibo_id','usuario_id','monto','metodo_pago','referencia','estado','fecha_pago'}


@pytest.mark.parametrize('field', ['tarjeta', 'cvv', 'numero', 'monto', 'numero_nequi'])
def test_checkout_rejects_sensitive_or_client_amount(checkout, field):
    receipt, db, payload = checkout
    payload[field] = 'must-not-be-stored'
    assert payments.simulate_checkout(NS(id=7), payload)[2] == 400
    db.session.execute.assert_not_called()


def test_checkout_owner_and_cancelled_receipt(checkout):
    receipt, db, payload = checkout
    assert payments.simulate_checkout(NS(id=8), payload)[2] == 404
    receipt.estado = 'anulado'
    assert payments.simulate_checkout(NS(id=7), payload)[2] == 409


def test_checkout_idempotent_retry(checkout):
    receipt, db, payload = checkout
    existing = dict(id=23, recibo_id=2, usuario_id=7, monto=Decimal('15000'), metodo_pago='tarjeta', referencia='SIM-TEST', estado='completado', fecha_pago=datetime.now())
    db.session.execute.return_value.mappings.return_value.first.return_value = existing
    receipt.estado = 'pagado'
    data, error, status = payments.simulate_checkout(NS(id=7), payload)
    assert status == 200 and data['id'] == 23 and not error
    assert db.session.execute.call_count == 1
    db.session.commit.assert_not_called()


def test_checkout_blocks_another_pending_attempt(checkout):
    receipt, db, payload = checkout
    db.session.execute.return_value.first.return_value = (1,)
    assert payments.simulate_checkout(NS(id=7), payload)[2] == 409
    db.session.commit.assert_not_called()


@pytest.mark.parametrize('receipt_id', [True, False, 1.5, 0, -1, '1.5', None])
def test_checkout_rejects_invalid_identifiers(checkout, receipt_id):
    _, db, payload = checkout
    payload['recibo_id'] = receipt_id
    assert payments.simulate_checkout(NS(id=7), payload)[2] == 400
    db.session.execute.assert_not_called()


def test_photo_verifies_contents_and_strips_trailing_data():
    output = BytesIO()
    Image.new('RGB', (10, 10), 'red').save(output, 'PNG')
    data, extension = repairs.prepare_photo(BytesIO(output.getvalue() + b'private trailing data'))
    assert extension == '.png' and b'private trailing data' not in data
    with pytest.raises(ValueError):
        repairs.prepare_photo(BytesIO(b'not a real image'))
    with pytest.raises(ValueError):
        repairs.prepare_photo(BytesIO(b'x' * (4 * 1024 * 1024 + 1)))


@pytest.fixture
def publication(monkeypatch, tmp_path):
    diagnostic = NS(observaciones='Anterior', cita=NS(vehiculo=NS(usuario_id=7, placa='ABC123')))
    work = NS(id=4, mecanico_id=10, estado='pendiente', orden=NS(estado_aprobacion='aprobado'), diagnostico=diagnostic, fecha_inicio=None, fecha_fin=None)
    monkeypatch.setattr(repairs, 'Trabajo', NS(query=query(first=work)))
    monkeypatch.setattr(repairs, 'UPLOAD_DIR', tmp_path)
    monkeypatch.setattr(repairs, 'column_exists', lambda *args: True)
    monkeypatch.setattr(repairs, 'trabajo_to_dict', lambda row: {'id': row.id, 'estado': row.estado})
    monkeypatch.setattr(repairs, 'Notificacion', lambda **kwargs: NS(id=8, **kwargs))
    db = MagicMock()
    monkeypatch.setattr(repairs, 'db', db)
    mail = MagicMock(return_value=({'correo_enviado': False, 'notificacion_id': 8}, None, 200))
    monkeypatch.setattr(repairs, 'deliver', mail)
    return work, db, mail, tmp_path


def test_publication_commits_before_mail_and_retains_on_failure(publication):
    work, db, mail, path = publication
    events = []
    db.session.commit.side_effect = lambda: events.append('commit')
    mail.side_effect = lambda *args: (events.append('mail') or ({'correo_enviado': False, 'notificacion_id': 8}, None, 200))
    data, error, status = repairs.publish(NS(id=10), 4, {'estado': 'en_proceso', 'observaciones': 'Revisión realizada'})
    assert events == ['commit', 'mail'] and status == 201 and not error
    assert not data['correo_enviado'] and work.fecha_inicio
    assert work.diagnostico.observaciones == 'Revisión realizada'


def test_publication_rejects_other_mechanic(publication):
    assert repairs.publish(NS(id=11), 4, {'estado': 'completado'})[2] == 404
    publication[1].session.commit.assert_not_called()
    publication[2].assert_not_called()


def test_publication_rollback_does_not_send_mail(publication):
    work, db, mail, path = publication
    output = BytesIO(); Image.new('RGB', (10, 10)).save(output, 'PNG'); output.seek(0)
    db.session.commit.side_effect = RuntimeError('simulated database failure')
    with Flask(__name__).app_context():
        assert repairs.publish(NS(id=10), 4, {'observaciones': 'Foto'}, [output])[2] == 409
    assert list(path.iterdir()) == []
    mail.assert_not_called()


def test_startup_does_not_connect_or_change_schema(monkeypatch):
    import app
    monkeypatch.setattr(app.db, 'create_all', MagicMock(side_effect=AssertionError('DDL forbidden')))
    monkeypatch.setattr(app, 'seed_services', MagicMock(side_effect=AssertionError('Unexpected seed')))
    app._initialize_database(None)
    app.db.create_all.assert_not_called()


@pytest.mark.parametrize('verb', ['CREATE TABLE x (id INT)', 'ALTER TABLE x ADD y INT', 'DROP TABLE x', 'TRUNCATE TABLE x', '/* comment */ RENAME TABLE x TO y'])
def test_runtime_guard_rejects_ddl(verb):
    from app.schema_guard import prevent_schema_changes
    with pytest.raises(RuntimeError):
        prevent_schema_changes(None, None, verb, None, None, False)


@pytest.mark.parametrize('sql', ['SELECT * FROM citas', 'INSERT INTO pagos VALUES (1)', 'UPDATE trabajos SET estado=:estado'])
def test_runtime_guard_allows_normal_operations(sql):
    from app.schema_guard import prevent_schema_changes
    prevent_schema_changes(None, None, sql, None, None, False)


def test_only_explicit_migration_connection_bypasses_guard():
    from app.schema_guard import prevent_schema_changes
    migration = NS(get_execution_options=lambda: {'jenna_schema_migration': True})
    prevent_schema_changes(migration, None, 'ALTER TABLE citas ADD example INT', None, None, False)
    normal = NS(get_execution_options=lambda: {})
    with pytest.raises(RuntimeError):
        prevent_schema_changes(normal, None, 'ALTER TABLE citas ADD example INT', None, None, False)
