from flask import jsonify, request

from ..services import citas_s as appointment_service


def _service_response(data, error, status, key='data'):
    if error:
        return jsonify({'error': error}), status
    return jsonify({key: data}), status or 200


def create_appointment():
    data, error, status = appointment_service.create_for_user(
        request.current_user, request.get_json(silent=True) or {}
    )
    return _service_response(data, error, status)


def verificar_disponibilidad():
    slot, error, status = appointment_service.parse_slot(request.get_json(silent=True) or {})
    if error:
        return jsonify({'error': error}), status
    return jsonify({'data': not appointment_service.occupied(*slot)})


def mis_citas():
    data, error, status = appointment_service.user_appointments(request.current_user)
    return _service_response(data, error, status)


def detalle_cita(cita_id):
    data, error, status = appointment_service.get_for_user(request.current_user, cita_id)
    return _service_response(data, error, status)


def cancelar_cita(cita_id):
    data, error, status = appointment_service.cancel(request.current_user, cita_id)
    return _service_response(data, error, status)


def admin_citas():
    filters = {key: (request.args.get(key) or '').strip().lower() for key in ('q', 'cliente', 'vehiculo', 'fecha', 'estado')}
    data, error, status = appointment_service.admin_list(filters)
    return _service_response(data, error, status)


def admin_cita_detalle(cita_id):
    cita = appointment_service.admin_get(cita_id)
    if not cita:
        return jsonify({'error': 'Cita no encontrada'}), 404
    if request.method == 'GET':
        return jsonify({'data': appointment_service.cita_to_dict(cita)})
    if request.method == 'DELETE':
        appointment_service.delete_admin(cita)
        return jsonify({'message': 'Cita eliminada correctamente.'})
    data, error, status = appointment_service.save_admin(cita, request.get_json(silent=True) or {})
    return _service_response(data, error, status)


def crear_cita_admin():
    data, error, status = appointment_service.save_admin(
        None, request.get_json(silent=True) or {}, creating=True
    )
    return _service_response(data, error, status)


def actualizar_estado_cita(cita_id):
    estado = (request.get_json(silent=True) or {}).get('estado')
    data, error, status = appointment_service.set_state(cita_id, estado)
    return _service_response(data, error, status)
