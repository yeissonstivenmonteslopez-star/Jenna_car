from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Cliente
from ..services.security import jwt_required

clientes_bp = Blueprint('clientes', __name__)


@clientes_bp.get('')
@jwt_required(roles=['admin'])
def listar_clientes():
    clientes = Cliente.query.all()
    result = []
    for c in clientes:
        u = c.usuario
        result.append({
            'id': c.id,
            'usuario_id': c.usuario_id,
            'documento': c.documento,
            'direccion': c.direccion,
            'ciudad': c.ciudad,
            'fecha_registro': c.fecha_registro.isoformat() if c.fecha_registro else None,
            'usuario': {
                'id': u.id,
                'nombre': u.nombre,
                'apellido': u.apellido,
                'email': u.email,
                'telefono': u.telefono,
                'rol': u.rol,
            } if u else None,
        })
    return jsonify({'data': result})


@clientes_bp.get('/<int:cliente_id>')
@jwt_required(roles=['admin'])
def obtener_cliente(cliente_id: int):
    cliente = db.session.get(Cliente, cliente_id)
    if not cliente:
        return jsonify({'error': 'Cliente no encontrado'}), 404
    u = cliente.usuario
    return jsonify({
        'data': {
            'id': cliente.id,
            'usuario_id': cliente.usuario_id,
            'documento': cliente.documento,
            'direccion': cliente.direccion,
            'ciudad': cliente.ciudad,
            'fecha_registro': cliente.fecha_registro.isoformat() if cliente.fecha_registro else None,
            'usuario': {
                'id': u.id,
                'nombre': u.nombre,
                'apellido': u.apellido,
                'email': u.email,
                'telefono': u.telefono,
                'rol': u.rol,
            } if u else None,
        }
    })
