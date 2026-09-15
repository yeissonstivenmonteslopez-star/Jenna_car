from flask import jsonify, request

from ..services import vehiculos as vehicle_service


def mis_vehiculos(): return jsonify({'data': vehicle_service.mine(request.current_user.id)})

def crear_vehiculo_cliente():
    data, error, status = vehicle_service.create_client(request.current_user.id, request.get_json(silent=True) or {})
    return (jsonify({'error': error}), status) if error else (jsonify({'data': data}), status)

def admin_vehiculos(): return jsonify({'data': vehicle_service.admin_list(request.args.get('q', '').strip())})

def admin_vehiculo_detalle(vehiculo_id):
    vehicle = vehicle_service.get(vehiculo_id)
    if not vehicle: return jsonify({'error': 'Vehículo no encontrado'}), 404
    return jsonify({'data': vehicle_service.vehicle_to_dict(vehicle)})

def crear_vehiculo_admin():
    data, error, status = vehicle_service.save_admin(request.get_json(silent=True) or {})
    return (jsonify({'error': error}), status) if error else (jsonify({'data': data}), status or 201)

def actualizar_vehiculo_admin(vehiculo_id):
    vehicle = vehicle_service.get(vehiculo_id)
    if not vehicle: return jsonify({'error': 'Vehículo no encontrado'}), 404
    data, error, status = vehicle_service.save_admin(request.get_json(silent=True) or {}, vehicle)
    return (jsonify({'error': error}), status) if error else jsonify({'data': data})

def eliminar_vehiculo_admin(vehiculo_id):
    vehicle = vehicle_service.get(vehiculo_id)
    if not vehicle: return jsonify({'error': 'Vehículo no encontrado'}), 404
    data, error, status = vehicle_service.delete(vehicle)
    return (jsonify({'error': error}), status) if error else jsonify(data)
