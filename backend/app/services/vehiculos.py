"""Vehicle domain operations."""
from ..models import Cliente, Vehiculo
from ..repository import clientes_r as client_repository
from ..repository import vehiculos_r as vehicle_repository
from ..schemas.serializers import vehicle_to_dict
from ..utils.validation import validar_placa

FUELS = {'gasolina', 'diesel', 'hibrido', 'electrico', 'gas'}

def mine(user_id):
	client = client_repository.find_by_user(user_id)
	return [vehicle_to_dict(v) for v in vehicle_repository.list_for_client(client.id)] if client else []

def create_client(user_id, payload):
	client = client_repository.find_by_user(user_id)
	if not client: return None, 'El usuario no tiene perfil de cliente', 403
	values, error, status = build_values(payload, client.id)
	if error: return None, error, status
	vehicle = Vehiculo(**values); vehicle_repository.add(vehicle); vehicle_repository.commit(); return vehicle_to_dict(vehicle), None, 201

def admin_list(query):
	return [vehicle_to_dict(v) for v in vehicle_repository.list_admin(query)]

def get(vehicle_id): return vehicle_repository.get(vehicle_id)

def build_values(payload, default_client_id=None, vehicle=None):
	client_id = payload.get('cliente_id', vehicle.cliente_id if vehicle else default_client_id)
	if not client_id: return None, 'El cliente es obligatorio', 400
	if not client_repository.get(client_id): return None, 'Cliente no encontrado', 404
	values = {'cliente_id': client_id}
	if 'placa' in payload or not vehicle:
		try: placa = validar_placa(payload.get('placa'))
		except ValueError as exc: return None, str(exc), 400
		if vehicle_repository.find_by_plate(placa, vehicle.id if vehicle else None): return None, 'Ya existe un vehículo con esa placa', 409
		values['placa'] = placa
	for field, label in [('marca', 'marca'), ('modelo', 'modelo')]:
		if field in payload or not vehicle:
			value = (payload.get(field) or '').strip()
			if not value: return None, f'La {label} es obligatoria', 400
			values[field] = value
	if 'anio' in payload or not vehicle:
		value = payload.get('anio')
		if value in (None, ''): values['anio'] = None
		else:
			try: values['anio'] = int(value)
			except (TypeError, ValueError): return None, 'El año debe ser un número válido', 400
			if not 1900 <= values['anio'] <= 2100: return None, 'El año no es válido', 400
	if 'color' in payload: values['color'] = (payload.get('color') or '').strip() or None
	if 'kilometraje' in payload or not vehicle:
		try: values['kilometraje'] = int(payload.get('kilometraje', 0))
		except (TypeError, ValueError): return None, 'El kilometraje debe ser un número válido', 400
		if values['kilometraje'] < 0: return None, 'El kilometraje no puede ser negativo', 400
	if 'tipo_combustible' in payload or not vehicle:
		fuel = (payload.get('tipo_combustible') or 'gasolina').strip()
		if fuel not in FUELS: return None, 'Tipo de combustible inválido', 400
		values['tipo_combustible'] = fuel
	if 'estado' in payload or not vehicle:
		state = (payload.get('estado') or 'activo').strip()
		if state not in {'activo', 'en_mantenimiento', 'inactivo'}: return None, 'Estado inválido', 400
		values['estado'] = state
	return values, None, None

def save_admin(payload, vehicle=None):
	values, error, status = build_values(payload, vehicle=vehicle)
	if error: return None, error, status
	if vehicle:
		for field, value in values.items(): setattr(vehicle, field, value)
	else:
		vehicle = Vehiculo(**values); vehicle_repository.add(vehicle)
	vehicle_repository.commit(); return vehicle_to_dict(vehicle), None, None if vehicle.id else 201

def delete(vehicle):
	if vehicle_repository.has_relations(vehicle.id):
		vehicle.estado = 'inactivo'; vehicle_repository.commit(); return {'data': vehicle_to_dict(vehicle), 'message': 'Vehículo desactivado porque tiene relaciones existentes.'}, None, None
	vehicle_repository.delete(vehicle); vehicle_repository.commit(); return {'message': 'Vehículo eliminado correctamente.'}, None, None
