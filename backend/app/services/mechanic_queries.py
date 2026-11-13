"""Read models for mechanic dashboards and customer repair progress."""
from ..extensions import db
from ..models import Cita, Vehiculo, Diagnostico, Trabajo, ImagenTrabajo, OrdenTrabajo
from ..schemas.serializers import diagnostico_to_dict, trabajo_to_dict


def mechanic_dashboard(user):
    """Dashboard completo para el mecánico."""
    # Total de citas asignadas
    total_citas = Cita.query.filter(Cita.mecanico_id == user.id).count()
    # Citas pendientes (asignadas pero no atendidas)
    pendientes = Cita.query.filter(Cita.mecanico_id == user.id, Cita.estado == 'pendiente').count()
    # Citas confirmadas
    confirmadas = Cita.query.filter(Cita.mecanico_id == user.id, Cita.estado == 'confirmada').count()
    # Reparaciones en proceso
    en_proceso = db.session.query(Trabajo).join(Trabajo.diagnostico).filter(
        Diagnostico.mecanico_id == user.id, Trabajo.estado == 'en_proceso'
    ).count()
    # Trabajos completados
    completados = db.session.query(Trabajo).join(Trabajo.diagnostico).filter(
        Diagnostico.mecanico_id == user.id, Trabajo.estado == 'completado'
    ).count()
    # Ultimas reparaciones
    ultimas_reparaciones = db.session.query(Trabajo).join(Trabajo.diagnostico).filter(
        Diagnostico.mecanico_id == user.id
    ).order_by(Trabajo.created_at.desc()).limit(5).all()
    ultimas = [trabajo_to_dict(t) for t in ultimas_reparaciones]

    return {
        'total_citas': total_citas,
        'pendientes': pendientes,
        'confirmadas': confirmadas,
        'en_proceso': en_proceso,
        'completados': completados,
        'ultimas_reparaciones': ultimas,
    }, None, None



def mechanic_appointments(user):
    """Citas asignadas al mecanico autenticado."""
    citas = Cita.query.filter(Cita.mecanico_id == user.id).order_by(Cita.fecha.desc(), Cita.hora.desc()).all()
    result = []
    for c in citas:
        vehiculo = c.vehiculo
        cliente = vehiculo.cliente if vehiculo else None
        result.append({
            'id': c.id,
            'fecha': str(c.fecha),
            'hora': str(c.hora),
            'cliente_nombre': f"{cliente.nombre} {cliente.apellido}" if cliente else 'Desconocido',
            'placa': vehiculo.placa if vehiculo else 'N/A',
            'marca': vehiculo.marca if vehiculo else 'N/A',
            'modelo': vehiculo.modelo if vehiculo else 'N/A',
            'anio': vehiculo.anio if vehiculo else 'N/A',
            'servicio': c.servicio.nombre if c.servicio else 'N/A',
            'motivo': c.motivo,
            'observaciones': c.observaciones,
            'estado': c.estado,
            'mecanico_id': c.mecanico_id,
        })
    return result, None, None



def mechanic_appointment_detail(user, cita_id):
    """Detalle de una cita asignada al mecanico."""
    cita = Cita.query.filter_by(id=cita_id).first()
    if not cita: return None, 'Cita no encontrada', 404
    # Verificar que la cita sea del mecanico
    if cita.mecanico_id != user.id:
        return None, 'No tienes permisos para ver esta cita', 403
    vehiculo = cita.vehiculo
    cliente = vehiculo.cliente if vehiculo else None
    diagnosticos = Diagnostico.query.filter_by(cita_id=cita.id).all()
    trabajos = Trabajo.query.join(Trabajo.diagnostico).filter(
        Diagnostico.cita_id == cita.id
    ).all()
    ordenes = OrdenTrabajo.query.filter(
        OrdenTrabajo.vehiculo_id == cita.vehiculo_id,
        ~OrdenTrabajo.estado.in_({'cancelada', 'entregada'}),
    ).order_by(OrdenTrabajo.created_at.desc(), OrdenTrabajo.id.desc()).all()
    ordenes_facturables = [
        orden for orden in ordenes
        if not orden.recibo or orden.recibo.estado == 'pendiente'
    ]
    imagenes = ImagenTrabajo.query.filter(ImagenTrabajo.trabajo_id.in_([t.id for t in trabajos])).all() if trabajos else []

    return {
        'id': cita.id,
        'fecha': str(cita.fecha),
        'hora': str(cita.hora),
        'cliente': {
            'nombre': cliente.nombre,
            'apellido': cliente.apellido,
            'email': cliente.email,
        } if cliente else None,
        'vehiculo': {
            'placa': vehiculo.placa,
            'marca': vehiculo.marca,
            'modelo': vehiculo.modelo,
            'anio': vehiculo.anio,
        } if vehiculo else None,
        'servicio': cita.servicio.nombre if cita.servicio else None,
        'motivo': cita.motivo,
        'observaciones': cita.observaciones,
        'estado': cita.estado,
        'mecanico_id': cita.mecanico_id,
        'diagnosticos': [diagnostico_to_dict(d) for d in diagnosticos],
        'trabajos': [trabajo_to_dict(t) for t in trabajos],
        'ordenes': [{'id': order.id, 'estado': order.estado, 'estado_aprobacion': order.estado_aprobacion, 'subtotal': float(order.subtotal or 0), 'total': float(order.total or 0)} for order in ordenes_facturables],
        'imagenes': [{
            'id': img.id,
            'ruta': img.ruta_imagen,
            'descripcion': img.descripcion,
            'created_at': img.created_at.isoformat() if img.created_at else None,
        } for img in imagenes],
    }, None, None



def mechanic_works_history(user):
    """Historial de trabajos del mecanico."""
    trabajos = Trabajo.query.filter_by(mecanico_id=user.id).order_by(Trabajo.created_at.desc()).all()
    return [trabajo_to_dict(t) for t in trabajos], None, None



def client_repair_progress(vehiculo_id, user):
    """Obtener progreso de reparacion para un cliente."""
    from ..models import Cita, Diagnostico, Trabajo, ImagenTrabajo

    # Obtener vehiculo y sus citas
    vehiculo = db.session.get(Vehiculo, vehiculo_id)
    if not vehiculo or vehiculo.usuario_id != user.id: return None, 'Vehiculo no encontrado', 404

    citas = Cita.query.filter_by(vehiculo_id=vehiculo.id).all()
    progress = []

    for cita in citas:
        diagnosticos = Diagnostico.query.filter_by(cita_id=cita.id).all()
        cita_progress = {
            'cita_id': cita.id,
            'fecha': str(cita.fecha),
            'hora': str(cita.hora),
            'estado': cita.estado,
            'diagnosticos': [],
            'trabajos': [],
            'imagenes': [],
        }

        for d in diagnosticos:
            d_trabajos = Trabajo.query.filter_by(diagnostico_id=d.id).all()
            d_imagenes = ImagenTrabajo.query.filter(
                ImagenTrabajo.trabajo_id.in_([t.id for t in d_trabajos if t.id])
            ).all() if d_trabajos else []

            cita_progress['diagnosticos'].append({
                'id': d.id,
                'descripcion': d.descripcion,
                'observaciones': d.observaciones,
                'solucion_recomendada': d.solucion_recomendada,
                'estado': d.estado,
                'fecha_diagnostico': d.fecha_diagnostico.isoformat() if d.fecha_diagnostico else None,
                'trabajos': [trabajo_to_dict(t) for t in d_trabajos],
                'imagenes': [{
                    'id': img.id,
                    'ruta': img.ruta_imagen,
                    'descripcion': img.descripcion,
                } for img in d_imagenes],
            })

            cita_progress['imagenes'].extend({
                'id': image.id, 'ruta': image.ruta_imagen, 'descripcion': image.descripcion,
                'created_at': image.created_at.isoformat() if image.created_at else None,
            } for image in d_imagenes)
            for t in d_trabajos:
                cita_progress['trabajos'].append(trabajo_to_dict(t))

        progress.append(cita_progress)

    return progress, None, None

