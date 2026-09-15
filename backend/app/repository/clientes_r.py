from ..extensions import db
from ..models import Cliente


def get(client_id):
    return db.session.get(Cliente, client_id)


def find_by_user(user_id):
    return Cliente.query.filter_by(usuario_id=user_id).first()


def list_all():
    return Cliente.query.all()


def add(client):
    db.session.add(client)
    return client


def delete_many(client_ids):
    Cliente.query.filter(Cliente.id.in_(client_ids)).delete(synchronize_session=False)