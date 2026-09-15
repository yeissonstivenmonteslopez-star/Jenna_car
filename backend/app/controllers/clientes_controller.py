from flask import jsonify

from ..services.clientes_s import listar_clientes as list_clients, obtener_cliente as get_client


def listar_clientes():
    return jsonify({'data': list_clients()})


def obtener_cliente(cliente_id):
    data = get_client(cliente_id)
    if data is None:
        return jsonify({'error': 'Cliente no encontrado'}), 404
    return jsonify({'data': data})
