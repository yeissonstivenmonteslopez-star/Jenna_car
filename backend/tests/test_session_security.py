from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from app.auth import decorators
from app.auth.jwt import create_access_token
from app.services import auth_s, reset_limits
from app.config import apply_config
from app.utils import email as mail


@pytest.fixture
def application(tmp_path):
    app = Flask(__name__)
    app.config.update(SECRET_KEY='a' * 32, UPLOADS_PATH=str(tmp_path / 'photos'))
    return app


def test_reset_invalidates_old_session_and_requires_header(application, monkeypatch):
    user = SimpleNamespace(id=1, password='old-hash', rol='usuario', estado='activo')
    monkeypatch.setattr(decorators, 'get_user', lambda _: user)

    @application.get('/session')
    @decorators.jwt_required()
    def session():
        return 'ok'

    with application.app_context():
        old = create_access_token(user)
        client = application.test_client()
        headers = {'Authorization': f'Bearer {old}'}
        assert client.get('/session', headers=headers).status_code == 200
        assert client.get('/session', query_string={'token': old}).status_code == 401
        reset = SimpleNamespace(used_at=None)
        monkeypatch.setattr(auth_s, '_validate_reset_code', lambda *_: (user, reset, None))
        monkeypatch.setattr(auth_s.auth_repository, 'commit', Mock())
        assert auth_s.confirm_password_reset('client@example.test', 'test', 'new-password')[1] is None
        assert client.get('/session', headers=headers).status_code == 401
        new = create_access_token(user)
        assert client.get('/session', headers={'Authorization': f'Bearer {new}'}).status_code == 200


def test_account_and_origin_limits(application, monkeypatch):
    clock = Mock(return_value=100000)
    monkeypatch.setattr(reset_limits.time, 'time', clock)
    with application.app_context():
        allow = reset_limits.allow_reset_request
        assert allow('client', 'ip')
        assert not allow('client', 'other')
        for i in range(29):
            assert allow(str(i), 'ip')
        assert not allow('another', 'ip')
        for i in range(4):
            clock.return_value += 61
            assert allow('client', 'other')
        clock.return_value += 61
        assert not allow('client', 'other')
        clock.return_value += 3600
        assert allow('client', 'ip')


def test_failed_login_limits_and_success_clears_them(application, monkeypatch):
    clock = Mock(return_value=200000)
    monkeypatch.setattr(reset_limits.time, 'time', clock)
    with application.app_context():
        for _ in range(8):
            assert reset_limits.allow_login_attempt('client@example.test', 'ip')
            reset_limits.record_login_failure('client@example.test', 'ip')
        assert not reset_limits.allow_login_attempt('client@example.test', 'other-ip')
        reset_limits.clear_login_failures('client@example.test')
        assert reset_limits.allow_login_attempt('client@example.test', 'ip')


def test_inactive_account_cannot_log_in(monkeypatch):
    user = SimpleNamespace(password='hash', estado='inactivo')
    monkeypatch.setattr(auth_s.auth_repository, 'find_by_email', lambda _: user)
    monkeypatch.setattr(auth_s, 'verify_password', lambda *_: True)
    data, error, status = auth_s.login('client@example.test', 'valid-password')
    assert data is None
    assert error == 'Credenciales incorrectas'
    assert status == 401


def test_recovery_public_response_is_independent_of_recipient(application, monkeypatch):
    monkeypatch.setattr(mail, 'correo_configurado', lambda: True)
    monkeypatch.setattr(auth_s, '_reset_executor', Mock())
    monkeypatch.setattr(auth_s, '_reset_capacity', Mock())
    with application.app_context():
        first = auth_s.request_password_reset('client@example.test', 'ip')
        assert first[2] == 202 and set(first[0]) == {'message'}
        assert first == auth_s.request_password_reset('unknown@example.test', 'ip')
        assert first == auth_s.request_password_reset('client@example.test', 'ip')
        assert auth_s._reset_executor.submit.call_count == 2


def test_production_rejects_debug(application, monkeypatch):
    monkeypatch.setenv('APP_ENV', 'production')
    monkeypatch.setenv('FLASK_DEBUG', 'true')
    with pytest.raises(RuntimeError, match='FLASK_DEBUG'):
        apply_config(application)


def test_smtp_delivery_failure_stays_private(application, monkeypatch):
    repo = Mock()
    repo.recent_reset_token.return_value = None
    repo.find_by_email.return_value = SimpleNamespace(id=1)
    send = Mock(return_value=False)
    monkeypatch.setattr(auth_s, 'auth_repository', repo)
    monkeypatch.setattr(mail, 'enviar_correo_async', send)
    with application.app_context():
        assert auth_s._issue_reset('client@example.test') is None
        send.assert_called_once()
        repo.commit.assert_called_once()
