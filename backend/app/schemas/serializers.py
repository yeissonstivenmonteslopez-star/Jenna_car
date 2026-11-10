def vehicle_to_dict(vehicle):
    cliente = vehicle.cliente
    cliente_data = None
    if cliente and cliente.usuario:
        cliente_data = {
            'id': cliente.id,
            'nombre': cliente.usuario.nombre,
            'apellido': cliente.usuario.apellido,
            'email': cliente.usuario.email,
        }

    return {
        'id': vehicle.id,
        'cliente_id': vehicle.cliente_id,
        'cliente': cliente_data,
        'placa': vehicle.placa,
        'marca': vehicle.marca,
        'modelo': vehicle.modelo,
        'anio': vehicle.anio,
        'color': vehicle.color,
        'kilometraje': vehicle.kilometraje,
        'tipo_combustible': vehicle.tipo_combustible,
        'estado': vehicle.estado,
        'created_at': vehicle.created_at.isoformat() if vehicle.created_at else None,
        'updated_at': vehicle.updated_at.isoformat() if vehicle.updated_at else None,
    }


def service_to_dict(service):
    return {
        'id': service.id,
        'nombre': service.nombre,
        'descripcion': service.descripcion,
        'precio': float(service.precio),
        'duracion_estimada': service.duracion_estimada,
        'estado': service.estado,
        'created_at': service.created_at.isoformat() if service.created_at else None,
        'updated_at': service.updated_at.isoformat() if service.updated_at else None,
    }


def cita_to_dict(cita):
    return {
        'id': cita.id, 'cliente_id': cita.cliente_id, 'vehiculo_id': cita.vehiculo_id,
        'servicio_id': cita.servicio_id,
        'cliente': {'id': cita.cliente.id, 'nombre': cita.cliente.usuario.nombre, 'apellido': cita.cliente.usuario.apellido} if cita.cliente and cita.cliente.usuario else None,
        'vehiculo': {'id': cita.vehiculo.id, 'marca': cita.vehiculo.marca, 'modelo': cita.vehiculo.modelo, 'placa': cita.vehiculo.placa} if cita.vehiculo else None,
        'servicio': {'id': cita.servicio.id, 'name': cita.servicio.nombre} if cita.servicio else None,
        'fecha': str(cita.fecha), 'hora': str(cita.hora), 'motivo': cita.motivo,
        'observaciones': cita.observaciones, 'estado': cita.estado,
        'created_at': cita.created_at.isoformat() if cita.created_at else None,
        'updated_at': cita.updated_at.isoformat() if cita.updated_at else None,
    }


def diagnostico_to_dict(diagnostico):
    return {
        'id': diagnostico.id,
        'cita_id': diagnostico.cita_id,
        'mecanico_id': diagnostico.mecanico_id,
        'descripcion': diagnostico.descripcion,
        'observaciones': diagnostico.observaciones,
        'solucion_recomendada': diagnostico.solucion_recomendada,
        'estado': diagnostico.estado,
        'fecha_diagnostico': diagnostico.fecha_diagnostico.isoformat() if diagnostico.fecha_diagnostico else None,
        'created_at': diagnostico.created_at.isoformat() if diagnostico.created_at else None,
        'updated_at': diagnostico.updated_at.isoformat() if diagnostico.updated_at else None,
    }


def trabajo_to_dict(trabajo):
    return {
        'id': trabajo.id,
        'diagnostico_id': trabajo.diagnostico_id,
        'servicio_id': trabajo.servicio_id,
        'mecanico_id': trabajo.mecanico_id,
        'orden_id': trabajo.orden_id,
        'descripcion': trabajo.descripcion,
        'estado': trabajo.estado,
        'fecha_inicio': trabajo.fecha_inicio.isoformat() if trabajo.fecha_inicio else None,
        'fecha_fin': trabajo.fecha_fin.isoformat() if trabajo.fecha_fin else None,
        'cantidad': trabajo.cantidad,
        'precio': float(trabajo.precio),
        'subtotal': float(trabajo.subtotal),
        'created_at': trabajo.created_at.isoformat() if trabajo.created_at else None,
        'updated_at': trabajo.updated_at.isoformat() if trabajo.updated_at else None,
    }
