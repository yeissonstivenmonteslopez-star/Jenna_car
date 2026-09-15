from flask import jsonify, request

from ..services import servicios as service_service


def listar_servicios():
    return jsonify({'data': service_service.list_public(request.args.get('q', '').strip(), request.args.get('estado', '').strip())})


def obtener_servicio(servicio_id):
    service = service_service.get(servicio_id)
    if not service:
        return jsonify({'error': 'Servicio no encontrado'}), 404
    return jsonify({'data': service_service.serialize_public(service)})


def admin_servicios():
    data = service_service.list_admin(request.args.get('q', '').strip(), request.args.get('estado', '').strip())
    return jsonify({'data': data})


def admin_servicio_detalle(servicio_id):
    service = service_service.get(servicio_id)
    if not service:
        return jsonify({'error': 'Servicio no encontrado'}), 404
    return jsonify({'data': service_service.service_to_dict(service)})


def crear_servicio_admin():
    data, error, status = service_service.create(request.get_json(silent=True) or {})
    return (jsonify({'error': error}), status) if error else (jsonify({'data': data}), status)


def actualizar_servicio_admin(servicio_id):
    service = service_service.get(servicio_id)
    if not service:
        return jsonify({'error': 'Servicio no encontrado'}), 404
    data, error, status = service_service.update(service, request.get_json(silent=True) or {})
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})


def eliminar_servicio_admin(servicio_id):
    service = service_service.get(servicio_id)
    if not service:
        return jsonify({'error': 'Servicio no encontrado'}), 404
    data, error, status = service_service.delete(service)
    return (jsonify({'error': error}), status) if error else jsonify(data)
