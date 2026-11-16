"""Notification contracts: no database connections and no real SMTP delivery."""
from decimal import Decimal
from types import SimpleNamespace as NS
from unittest.mock import MagicMock

import pytest

from app.services import payment_notifications as notifications


@pytest.fixture
def alerts(monkeypatch):
    customer = NS(id=7, nombre='Ana', apellido='Pérez', email='customer@example.test')
    admins = [NS(id=1, email='admin@example.test'), NS(id=2, email=None)]
    query = MagicMock()
    query.filter_by.return_value.all.return_value = admins
    monkeypatch.setattr(notifications, 'Usuario', NS(query=query))
    monkeypatch.setattr(notifications, 'Notificacion', lambda **fields: NS(**fields))
    database = MagicMock()
    monkeypatch.setattr(notifications, 'db', database)
    return customer, admins, query, database


def test_customer_and_all_active_admins_get_unread_simulation_alerts(alerts):
    customer, admins, query, database = alerts
    receipt = NS(id=12, total=Decimal('150000.00'))
    emails = notifications.prepare_simulated_payment_notifications(customer, receipt, 'SIM-TEST')
    rows = [call.args[0] for call in database.session.add.call_args_list]
    assert [row.usuario_id for row in rows] == [7, 1, 2]
    assert rows[0].titulo == 'Pago simulado exitoso'
    assert all(row.titulo == 'Pago simulado recibido' for row in rows[1:])
    assert all(row.tipo == 'pago' and row.leida is False for row in rows)
    assert all('no se ha cobrado dinero real' in row.mensaje and 'SIM-TEST' in row.mensaje for row in rows)
    assert rows[0].link == '/mis-recibos' and rows[1].link == '/admin/orders'
    assert len(emails) == 2  # Missing email never suppresses an in-app notification.
    query.filter_by.assert_called_once_with(rol='admin', estado='activo')
    database.session.commit.assert_not_called()


def test_an_admin_paying_their_own_receipt_is_not_notified_twice(alerts):
    customer, admins, _, database = alerts
    customer.id = admins[0].id
    notifications.prepare_simulated_payment_notifications(customer, NS(id=12, total=100), 'SIM-TEST')
    assert database.session.add.call_count == 2


def test_email_dispatch_escapes_content_and_continues_after_failure(monkeypatch):
    sender = MagicMock(side_effect=[RuntimeError('SMTP unavailable'), True])
    monkeypatch.setattr(notifications, 'enviar_correo', sender)
    notifications.send_payment_notification_emails([
        ('first@example.test', 'Pago', 'Simulación'),
        ('second@example.test', 'Pago <simulado>', 'Cliente <Ana> & recibo'),
    ])
    assert sender.call_count == 2
    html = sender.call_args.args[2]
    assert '&lt;simulado&gt;' in html and '&lt;Ana&gt; &amp; recibo' in html


def test_unconfigured_smtp_does_not_fail_a_committed_payment(monkeypatch):
    monkeypatch.setattr(notifications, 'enviar_correo', MagicMock(return_value=False))
    notifications.send_payment_notification_emails([('customer@example.test', 'Pago', 'Simulación')])
