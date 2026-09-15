from flask import jsonify, request

from ..services import ordenes_s as order_service


def admin_ordenes():
    return jsonify({'data': order_service.list_all()})


def crear_orden_admin():
    data, error, status = order_service.create(request.get_json(silent=True) or {})
    return (jsonify({'error': error}), status) if error else (jsonify({'data': data}), status)


def obtener_orden_admin(orden_id):
    order = order_service.get(orden_id)
    if not order:
        return jsonify({'error': 'Orden no encontrada'}), 404
    return jsonify({'data': order_service.order_to_dict(order)})


def actualizar_orden_admin(orden_id):
    order = order_service.get(orden_id)
    if not order:
        return jsonify({'error': 'Orden no encontrada'}), 404
    data, error, status = order_service.update(order, request.get_json(silent=True) or {})
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})


def eliminar_orden_admin(orden_id):
    order = order_service.get(orden_id)
    if not order:
        return jsonify({'error': 'Orden no encontrada'}), 404
    data, error, status = order_service.delete(order)
    return (jsonify({'error': error}), status) if error else jsonify(data)
