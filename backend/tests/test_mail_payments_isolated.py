"""Isolated checks: no application import, database engine, SMTP or HTTP traffic."""
import importlib.util
import os
from pathlib import Path
import smtplib
import sys
import types
import unittest
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

ROOT = Path(__file__).resolve().parents[1] / 'app'


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


# Fake package tree prevents executing app/__init__.py and its DB initialization.
for name in ['isolated', 'isolated.services', 'isolated.utils']:
    module = types.ModuleType(name)
    module.__path__ = []
    sys.modules[name] = module
extensions = types.ModuleType('isolated.extensions')
extensions.db = MagicMock()
sys.modules[extensions.__name__] = extensions
models = types.ModuleType('isolated.models')
for name in ['OrdenTrabajo', 'Pago', 'Recibo', 'Usuario', 'Vehiculo']:
    setattr(models, name, MagicMock())
sys.modules[models.__name__] = models
serializer = load('isolated.utils.payments', ROOT / 'utils/payments.py')
mail = load('isolated.utils.email', ROOT / 'utils/email.py')
flask_stub = types.ModuleType('flask')
flask_stub.current_app = MagicMock()
with patch.dict(sys.modules, {'flask': flask_stub}):
    service = load('isolated.services.pagos_s', ROOT / 'services/pagos_s.py')


class IsolatedTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)
        extensions.db.reset_mock()
        models.Pago.reset_mock()

    def smtp(self):
        os.environ.update(SMTP_EMAIL='sender@gmail.com', SMTP_PASSWORD='app-password')

    def checkout_config(self):
        os.environ.update(MERCADOPAGO_ACCESS_TOKEN='fake-token', MERCADOPAGO_WEBHOOK_SECRET='fake-secret',
                          MERCADOPAGO_WEBHOOK_URL='https://api.example.com/webhook',
                          MERCADOPAGO_RETURN_URL='https://example.com/mis-recibos')

    def receipt(self):
        return SimpleNamespace(id=1, orden_id=11, estado='pendiente', total=Decimal('15000'),
                               enviado_cliente=True,
                               orden_trabajo=SimpleNamespace(vehiculo=SimpleNamespace(usuario_id=7)))

    def test_simulation_registers_payment_without_provider_or_new_schema(self):
        os.environ['PAYMENTS_SIMULATED'] = 'true'
        receipt = self.receipt()
        extensions.db.session.get.return_value = receipt
        extensions.db.session.execute.return_value.lastrowid = 42
        with patch.object(service, 'mp_api') as api:
            data, error, status = service.create(SimpleNamespace(id=7), {'recibo_id': 1, 'monto': 1})
            api.assert_not_called()
        self.assertEqual(status, 201)
        self.assertIsNone(error)
        self.assertTrue(data['simulacion'])
        self.assertEqual(data['metodo_pago'], 'Simulación')
        self.assertTrue(data['referencia'].startswith('SIM-'))
        self.assertEqual(data['monto'], 15000)
        self.assertEqual(receipt.estado, 'pagado')
        self.assertEqual(data['recibo']['estado'], 'pagado')
        extensions.db.session.commit.assert_called_once()
        sql = extensions.db.text.call_args.args[0]
        self.assertNotIn('mercado_pago', sql)
        extensions.db.session.get.assert_called_once_with(models.Recibo, 1, with_for_update=True)

    def test_simulation_rejects_another_owners_receipt(self):
        os.environ['PAYMENTS_SIMULATED'] = 'true'
        receipt = self.receipt()
        receipt.orden_trabajo.vehiculo.usuario_id = 8
        extensions.db.session.get.return_value = receipt
        self.assertEqual(service.create(SimpleNamespace(id=7), {'recibo_id': 1})[2], 404)
        extensions.db.session.execute.assert_not_called()

    def test_simulation_rejects_duplicate_payment(self):
        os.environ['PAYMENTS_SIMULATED'] = 'true'
        receipt = self.receipt()
        receipt.estado = 'pagado'
        extensions.db.session.get.return_value = receipt
        self.assertEqual(service.create(SimpleNamespace(id=7), {'recibo_id': 1})[2], 409)
        extensions.db.session.execute.assert_not_called()

    def test_simulation_rejects_receipt_not_sent_by_admin(self):
        os.environ['PAYMENTS_SIMULATED'] = 'true'
        receipt = self.receipt()
        receipt.enviado_cliente = False
        extensions.db.session.get.return_value = receipt
        self.assertEqual(service.create(SimpleNamespace(id=7), {'recibo_id': 1})[2], 409)
        extensions.db.session.execute.assert_not_called()

    def test_simulation_rolls_back_on_commit_failure(self):
        os.environ['PAYMENTS_SIMULATED'] = 'true'
        extensions.db.session.get.return_value = self.receipt()
        with patch.object(extensions.db.session, 'commit', side_effect=RuntimeError('fake failure')):
            self.assertEqual(service.create(SimpleNamespace(id=7), {'recibo_id': 1})[2], 409)
        extensions.db.session.rollback.assert_called_once()

    def test_request_cannot_enable_simulation(self):
        self.assertFalse(service.simulation_enabled())
        self.assertEqual(service.create(SimpleNamespace(id=7), {'recibo_id': 1, 'simulacion': True})[2], 503)
        extensions.db.session.execute.assert_not_called()

    def test_missing_smtp(self):
        self.assertFalse(mail.correo_configurado())
        with patch.object(mail.smtplib, 'SMTP') as smtp:
            self.assertFalse(mail.enviar_correo_async('target@gmail.com', 'Test', '<p>Hola</p>'))
            smtp.assert_not_called()

    def test_gmail_tls_legacy_configuration(self):
        self.smtp()
        with patch.object(mail.smtplib, 'SMTP') as smtp:
            server = smtp.return_value.__enter__.return_value
            server.send_message.return_value = {}
            self.assertTrue(mail.enviar_correo_async('target@gmail.com', 'Test', '<p>Hola</p>'))
            smtp.assert_called_once_with('smtp.gmail.com', 587, timeout=15)
            server.starttls.assert_called_once()
            server.login.assert_called_once_with('sender@gmail.com', 'app-password')
            self.assertEqual(server.send_message.call_args.args[0]['To'], 'target@gmail.com')

    def test_smtp_failure_reported(self):
        self.smtp()
        with patch.object(mail.smtplib, 'SMTP', side_effect=smtplib.SMTPAuthenticationError(535, b'rejected')):
            self.assertFalse(mail.enviar_correo_async('target@gmail.com', 'Test', '<p>Hola</p>'))

    def test_smtp_ssl_and_documented_names(self):
        os.environ.update(MAIL_USERNAME='sender@example.com', MAIL_PASSWORD='password', MAIL_PORT='465', MAIL_USE_SSL='true')
        with patch.object(mail.smtplib, 'SMTP_SSL') as smtp:
            server = smtp.return_value.__enter__.return_value
            server.send_message.return_value = {}
            self.assertTrue(mail.enviar_correo_async('target@gmail.com', 'Test', '<p>Hola</p>'))
            server.starttls.assert_not_called()

    def test_missing_checkout_configuration_does_not_access_db(self):
        self.assertEqual(service.create(SimpleNamespace(id=7), {'recibo_id': 1})[2], 503)
        extensions.db.session.get.assert_not_called()

    def test_invalid_receipt_id(self):
        for value in ['invalid', 1.5, True, -1, None]:
            self.assertEqual(service.create(SimpleNamespace(id=7), {'recibo_id': value})[2], 400)
        extensions.db.session.get.assert_not_called()

    def test_other_owners_receipt_cannot_be_paid(self):
        self.checkout_config()
        receipt = self.receipt()
        receipt.orden_trabajo.vehiculo.usuario_id = 8
        extensions.db.session.get.return_value = receipt
        with patch.object(service, 'mp_api') as api:
            self.assertEqual(service.create(SimpleNamespace(id=7), {'recibo_id': 1})[2], 404)
            api.assert_not_called()

    def test_checkout_uses_server_amount_and_keeps_receipt_pending(self):
        self.checkout_config()
        receipt = self.receipt()
        extensions.db.session.get.return_value = receipt
        with patch.object(service, 'mp_api', return_value=({'init_point': 'https://www.mercadopago.com.co/checkout'}, None, 201)) as api, patch.object(service, 'payment_to_dict', return_value={'estado': 'pendiente'}):
            data, error, status = service.create(SimpleNamespace(id=7, email='user@gmail.com'), {'recibo_id': 1, 'monto': 1})
            self.assertIsNone(error)
            self.assertEqual(status, 201)
            self.assertEqual(receipt.estado, 'pendiente')
            self.assertEqual(api.call_args.args[0], '/checkout/preferences')
            self.assertEqual(api.call_args.args[2]['items'][0]['unit_price'], 15000)
            self.assertIn('url_redireccion', data)
            self.assertEqual(models.Pago.call_args.kwargs['estado'], 'pendiente')

    def test_webhook_signature_requires_secret_and_canonical_manifest(self):
        import hmac, hashlib
        self.assertFalse(service.validate_mp_webhook_signature('123', 'anything', 'req'))
        os.environ['MERCADOPAGO_WEBHOOK_SECRET'] = 'test-secret'
        digest = hmac.new(b'test-secret', b'id:123;request-id:req;ts:12345;', hashlib.sha256).hexdigest()
        self.assertTrue(service.validate_mp_webhook_signature('123', f'ts=12345,v1={digest}', 'req'))
        self.assertFalse(service.validate_mp_webhook_signature('124', f'ts=12345,v1={digest}', 'req'))
        self.assertFalse(service.validate_mp_webhook_signature('123', 'bad', 'req'))

    def provider_check(self, status='approved', amount=15000):
        payment = SimpleNamespace(id=3, recibo_id=1, monto=Decimal('15000'), estado='pendiente')
        receipt = self.receipt()
        models.Pago.query.filter_by.return_value.with_for_update.return_value.first.return_value = payment
        extensions.db.session.get.return_value = receipt
        response = {'id': 123, 'external_reference': 'MP-1-test', 'status': status,
                    'transaction_amount': amount, 'currency_id': 'COP'}
        return payment, receipt, response

    def test_verified_approval_settles_receipt(self):
        payment, receipt, response = self.provider_check()
        with patch.object(service, 'mp_api', return_value=(response, None, 200)):
            self.assertEqual(service.process_webhook('123')[2], 200)
        self.assertEqual(payment.estado, 'completado')
        self.assertEqual(receipt.estado, 'pagado')
        extensions.db.session.commit.assert_called_once()

    def test_amount_mismatch_never_settles_receipt(self):
        payment, receipt, response = self.provider_check(amount=1)
        with patch.object(service, 'mp_api', return_value=(response, None, 200)):
            self.assertEqual(service.process_webhook('123')[2], 400)
        self.assertEqual(receipt.estado, 'pendiente')
        extensions.db.session.commit.assert_not_called()

    def test_rejected_attempt_keeps_receipt_payable(self):
        payment, receipt, response = self.provider_check(status='rejected')
        with patch.object(service, 'mp_api', return_value=(response, None, 200)):
            self.assertEqual(service.process_webhook('123')[2], 200)
        self.assertEqual(payment.estado, 'anulado')
        self.assertEqual(receipt.estado, 'pendiente')

    def test_delayed_pending_event_does_not_undo_approval(self):
        payment, receipt, response = self.provider_check(status='pending')
        payment.estado = 'completado'
        payment.mercado_pago_payment_id = '123'
        receipt.estado = 'pagado'
        with patch.object(service, 'mp_api', return_value=(response, None, 200)):
            self.assertEqual(service.process_webhook('123')[2], 200)
        self.assertEqual(receipt.estado, 'pagado')
        extensions.db.session.commit.assert_not_called()

    def test_recovery_reports_smtp_failure_without_real_repository(self):
        import ast
        from datetime import datetime, timezone, timedelta
        tree = ast.parse((ROOT / 'services/auth_s.py').read_text(encoding='utf-8'))
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'request_password_reset')
        namespace = {'__package__': 'isolated.services', 'auth_repository': MagicMock(),
                     'datetime': datetime, 'timezone': timezone, 'timedelta': timedelta,
                     'secrets': MagicMock(), 'PasswordResetToken': MagicMock(), 'hash_password': MagicMock()}
        namespace['secrets'].randbelow.return_value = 123456
        exec(compile(ast.Module(body=[function], type_ignores=[]), 'isolated_recovery', 'exec'), namespace)
        with patch.object(mail, 'correo_configurado', return_value=True), patch.object(mail, 'enviar_correo_async', return_value=False):
            self.assertEqual(namespace['request_password_reset']('user@gmail.com')[2], 503)
        with patch.object(mail, 'correo_configurado', return_value=True), patch.object(mail, 'enviar_correo_async', return_value=True):
            data, error, status = namespace['request_password_reset']('user@gmail.com')
            self.assertEqual(status, 202)
            self.assertFalse(data['manual_reset'])

    def test_serializer_distinguishes_old_simulation_and_real_payment(self):
        payment = SimpleNamespace(id=1, recibo_id=2, recibo=None, monto=10, metodo_pago='mercado_pago',
                                  referencia='MP-1-test', estado='pendiente', fecha_pago=None)
        self.assertFalse(serializer.payment_to_dict(payment)['simulacion'])
        payment.referencia = 'NEQUI-OLD'
        self.assertTrue(serializer.payment_to_dict(payment)['simulacion'])


if __name__ == '__main__':
    unittest.main()
