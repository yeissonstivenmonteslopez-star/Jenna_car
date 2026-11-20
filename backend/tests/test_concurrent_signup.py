from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from sqlalchemy import create_engine

from app import Usuario, create_app
from app.services import auth_s


def test_parallel_signups(tmp_path, monkeypatch):
    uri = 'sqlite:///' + (tmp_path / 'users.db').as_posix()
    engine = create_engine(uri)
    Usuario.__table__.create(engine)
    engine.dispose()
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': uri})

    def identity(subject):
        return {'sub': subject, 'email': subject + '@example.com'}, None, None

    monkeypatch.setattr(auth_s, 'google_identity', identity)

    def parallel(path, payloads):
        start = Barrier(len(payloads))

        def post(payload):
            with app.test_client() as client:
                start.wait(timeout=10)
                response = client.post(path, json=payload)
                return response.status_code, response.get_json()

        with ThreadPoolExecutor(max_workers=len(payloads)) as pool:
            return list(pool.map(post, payloads))

    subjects = ['shared', 'shared', 'second', 'third']
    results = parallel('/api/auth/google', [{'id_token': sub} for sub in subjects])
    assert all(status == 200 for status, _ in results)
    ids = [body['user']['id'] for _, body in results]
    assert ids[0] == ids[1] and len(set(ids)) == 3

    form = dict(nombre='Test', apellido='User', telefono='3001234567', password='test-password')
    results = parallel('/api/auth/register', [dict(form, email=sub + '@test.example') for sub in subjects])
    assert sorted(status for status, _ in results) == [201, 201, 201, 409]
