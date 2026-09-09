from ..extensions import db
from ..models import Cliente


def _serialize_cliente(cliente):
	usuario = cliente.usuario
	return {
		'id': cliente.id, 'usuario_id': cliente.usuario_id, 'documento': cliente.documento,
		'direccion': cliente.direccion, 'ciudad': cliente.ciudad,
		'fecha_registro': cliente.fecha_registro.isoformat() if cliente.fecha_registro else None,
		'usuario': {
			'id': usuario.id, 'nombre': usuario.nombre, 'apellido': usuario.apellido,
			'email': usuario.email, 'telefono': usuario.telefono, 'rol': usuario.rol,
		} if usuario else None,
	}


def listar_clientes():
	return [_serialize_cliente(cliente) for cliente in Cliente.query.all()]


def obtener_cliente(cliente_id):
	cliente = db.session.get(Cliente, cliente_id)
	return _serialize_cliente(cliente) if cliente else None
