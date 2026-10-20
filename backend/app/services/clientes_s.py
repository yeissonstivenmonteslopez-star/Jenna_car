from ..extensions import db
from ..models import Usuario


def _serialize_cliente(usuario):
	return {
		'id': usuario.id, 'usuario_id': usuario.id, 'documento': usuario.documento,
		'direccion': usuario.direccion, 'ciudad': usuario.ciudad,
		'fecha_registro': usuario.fecha_registro.isoformat() if usuario.fecha_registro else None,
		'usuario': {
			'id': usuario.id, 'nombre': usuario.nombre, 'apellido': usuario.apellido,
			'email': usuario.email, 'telefono': usuario.telefono, 'rol': usuario.rol,
		},
	}


def listar_clientes():
	return [_serialize_cliente(usuario) for usuario in Usuario.query.filter_by(rol='usuario').all()]


def obtener_cliente(cliente_id):
	usuario = db.session.get(Usuario, cliente_id)
	return _serialize_cliente(usuario) if usuario and usuario.rol == 'usuario' else None
