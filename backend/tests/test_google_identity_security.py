"""Test Google verification without importing Flask app or touching any database."""
import ast
import os
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest


@pytest.fixture
def verifier(monkeypatch):
    monkeypatch.setenv('GOOGLE_CLIENT_IDS', 'allowed.apps.googleusercontent.com')
    monkeypatch.delenv('GOOGLE_CLIENT_ID', raising=False)
    source = Path(__file__).parents[1] / 'app/services/auth_s.py'
    tree = ast.parse(source.read_text(encoding='utf-8'))
    function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'google_identity')
    verify = Mock()
    scope = {'os': os, 'google_id_token': SimpleNamespace(verify_oauth2_token=verify), 'google_requests': SimpleNamespace(Request=Mock())}
    exec(compile(ast.Module(body=[function], type_ignores=[]), str(source), 'exec'), scope)
    return scope['google_identity'], verify


def claims(**changes):
    return dict(aud='allowed.apps.googleusercontent.com', sub='test-subject', iss='https://accounts.google.com', email='test@example.com', email_verified=True, **changes)


def test_rejects_signature_failure_without_fallback(verifier):
    identity, verify = verifier
    verify.side_effect = ValueError('provider detail must remain private')
    result, message, status = identity('forged-token')
    assert result is None and status == 401
    assert 'provider detail' not in message
    assert verify.call_count == 1
    assert verify.call_args.kwargs['audience'] == 'allowed.apps.googleusercontent.com'


def test_requires_configured_audience(verifier, monkeypatch):
    identity, verify = verifier
    monkeypatch.delenv('GOOGLE_CLIENT_IDS')
    assert identity('token')[2] == 503
    verify.assert_not_called()


@pytest.mark.parametrize('field,value', [('aud', 'other-client'), ('sub', ''), ('iss', 'attacker'), ('email_verified', False), ('email', '')])
def test_rejects_invalid_identity(verifier, field, value):
    identity, verify = verifier
    payload = claims()
    payload[field] = value
    verify.return_value = payload
    assert identity('token')[0] is None


def test_accepts_verified_identity(verifier):
    identity, verify = verifier
    verify.return_value = claims()
    result, error, status = identity('valid-token')
    assert result['sub'] == 'test-subject'
    assert error is None and status is None
