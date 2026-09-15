"""Service catalog domain operations."""
from decimal import Decimal
from ..models import Servicio
from ..repository import servicios_r as service_repository
from ..schemas.serializers import service_to_dict


def list_public(query, estado):
	return [{'id': s.id, 'name': s.nombre, 'description': s.descripcion, 'price': float(s.precio), 'duration_minutes': s.duracion_estimada} for s in service_repository.list_public(query, estado)]


def get(service_id):
	return service_repository.get(service_id)


def serialize_public(service):
	return {'id': service.id, 'name': service.nombre, 'description': service.descripcion, 'price': float(service.precio), 'duration_minutes': service.duracion_estimada}


def list_admin(query, estado):
	return [service_to_dict(service) for service in service_repository.list_admin(query, estado)]


def create(payload):
	nombre = (payload.get('nombre') or '').strip()
	descripcion = (payload.get('descripcion') or '').strip() or None
	if not nombre: return None, 'El nombre es obligatorio', 400
	if payload.get('precio') is None: return None, 'El precio es obligatorio', 400
	if payload.get('duracion_estimada') is None: return None, 'La duración estimada es obligatoria', 400
	try: precio = Decimal(str(payload['precio'])); duracion = int(payload['duracion_estimada'])
	except (ValueError, TypeError, ArithmeticError): return None, 'El precio y la duración deben ser válidos', 400
	estado = (payload.get('estado') or 'activo').strip()
	if precio < 0 or duracion < 0: return None, 'El precio y la duración no pueden ser negativos', 400
	if estado not in {'activo', 'inactivo'}: return None, 'Estado inválido', 400
	if service_repository.find_by_name(nombre): return None, 'Ya existe un servicio con ese nombre', 409
	service = Servicio(nombre=nombre, descripcion=descripcion, precio=precio, duracion_estimada=duracion, estado=estado); service_repository.add(service); service_repository.commit()
	return service_to_dict(service), None, 201


def update(service, payload):
	if 'nombre' in payload:
		nombre = (payload.get('nombre') or '').strip()
		if not nombre: return None, 'El nombre es obligatorio', 400
		if service_repository.find_by_name(nombre, service.id): return None, 'Ya existe un servicio con ese nombre', 409
		service.nombre = nombre
	if 'descripcion' in payload: service.descripcion = (payload.get('descripcion') or '').strip() or None
	if 'precio' in payload:
		try: service.precio = Decimal(str(payload['precio']))
		except (ValueError, TypeError, ArithmeticError): return None, 'El precio debe ser válido', 400
		if service.precio < 0: return None, 'El precio no puede ser negativo', 400
	if 'duracion_estimada' in payload:
		try: service.duracion_estimada = int(payload['duracion_estimada'])
		except (ValueError, TypeError): return None, 'La duración estimada debe ser válida', 400
		if service.duracion_estimada < 0: return None, 'La duración no puede ser negativa', 400
	if 'estado' in payload:
		if payload['estado'] not in {'activo', 'inactivo'}: return None, 'Estado inválido', 400
		service.estado = payload['estado']
	service_repository.commit(); return service_to_dict(service), None, None


def delete(service):
	if service_repository.has_relations(service.id):
		service.estado = 'inactivo'; service_repository.commit(); return {'data': service_to_dict(service), 'message': 'Servicio desactivado porque tiene relaciones existentes.'}, None, None
	service_repository.delete(service); service_repository.commit(); return {'message': 'Servicio eliminado correctamente.'}, None, None
