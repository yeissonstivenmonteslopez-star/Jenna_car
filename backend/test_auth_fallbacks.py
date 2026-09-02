import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import app as backend_app

backend_app.app.config['TESTING'] = True


def test_password_reset_falls_back_to_manual_code_when_smtp_is_missing():
    email = 'fallback-reset-user@example.com'

    with backend_app.app.app_context():
        existing = backend_app.Usuario.query.filter_by(email=email).first()
        if existing:
            backend_app.PasswordResetToken.query.filter_by(usuario_id=existing.id).delete()
            backend_app.db.session.delete(existing)
            backend_app.db.session.commit()

        usuario = backend_app.Usuario(
            nombre='Fallback',
            apellido='User',
            email=email,
            password=backend_app.generate_password_hash('fallback123'),
            rol='usuario',
            estado='activo',
        )
        backend_app.db.session.add(usuario)
        backend_app.db.session.commit()

        client = backend_app.app.test_client()
        response = client.post('/api/auth/forgot-password', json={'email': email})

        assert response.status_code == 202, response.get_data(as_text=True)
        payload = response.get_json()
        assert payload.get('code'), payload
        assert 'instrucciones' in (payload.get('message') or '').lower() or 'código' in (payload.get('message') or '').lower()

        backend_app.PasswordResetToken.query.filter_by(usuario_id=usuario.id).delete()
        backend_app.db.session.delete(usuario)
        backend_app.db.session.commit()


def test_google_login_accepts_valid_token_and_returns_user_and_token(monkeypatch):
    email = 'google-user@example.com'
    google_sub = 'google-uid-12345'

    with backend_app.app.app_context():
        existing = backend_app.Usuario.query.filter_by(email=email).first()
        if existing:
            backend_app.db.session.delete(existing)
            backend_app.db.session.commit()

        def fake_verify(token, request):
            assert token == 'valid-google-token'
            return {
                'aud': '1090175283717-cldfrqf1vn6d5ol837muh4hv4kdl69sh.apps.googleusercontent.com',
                'azp': '1090175283717-cldfrqf1vn6d5ol837muh4hv4kdl69sh.apps.googleusercontent.com',
                'email_verified': True,
                'email': email,
                'sub': google_sub,
                'given_name': 'Google',
                'family_name': 'User',
                'name': 'Google User',
                'picture': 'https://example.com/avatar.png',
            }

        monkeypatch.setattr(backend_app.google_id_token, 'verify_oauth2_token', fake_verify)

        client = backend_app.app.test_client()
        response = client.post('/api/auth/google', json={'id_token': 'valid-google-token'})

        assert response.status_code == 200, response.get_data(as_text=True)
        payload = response.get_json()
        assert payload['token']
        assert payload['user']['email'] == email
        assert payload['user']['google_id'] == google_sub

        user = backend_app.Usuario.query.filter_by(email=email).first()
        assert user is not None
        assert user.google_id == google_sub

        backend_app.PasswordResetToken.query.filter_by(usuario_id=user.id).delete()
        backend_app.db.session.delete(user)
        backend_app.db.session.commit()
