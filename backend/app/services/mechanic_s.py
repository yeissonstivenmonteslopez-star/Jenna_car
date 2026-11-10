"""Mechanic dashboard and appointment queries."""
from datetime import datetime
from ..extensions import db
from ..models import Cita, Servicio, Usuario, Vehiculo, Diagnostico, Trabajo, ImagenTrabajo
from ..schemas.serializers import cita_to_dict, diagnostico_to_dict, trabajo_to_dict


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
        'imagenes': [{
            'id': img.id,
            'ruta': img.ruta_imagen,
            'descripcion': img.descripcion,
            'created_at': img.created_at.isoformat() if img.created_at else None,
        } for img in imagenes],
    }, None, None


def register_diagnostico(user, cita_id, payload):
    """Registrar un diagnostico asociado a una cita."""
    from ..models import Cita
    # Verificar que la cita existe y es del mecanico
    cita = Cita.query.filter_by(id=cita_id).first()
    if not cita: return None, 'Cita no encontrada', 404
    if cita.mecanico_id != user.id:
        return None, 'No tienes permisos para registrar diagnostico en esta cita', 403
    # Verificar que ya no tenga diagnostico
    existing = Diagnostico.query.filter_by(cita_id=cita_id).first()
    if existing:
        return None, 'Esta cita ya tiene un diagnostico registrado', 409
    if not (payload.get('descripcion') or '').strip() or payload.get('estado', 'pendiente') not in {'pendiente', 'en_proceso', 'completado'}:
        return None, 'Descripción o estado inválidos', 400
    # Crear diagnostico
    diagnostico = Diagnostico(
        cita_id=cita_id,
        mecanico_id=user.id,
        descripcion=payload.get('descripcion') or '',
        observaciones=payload.get('observaciones'),
        solucion_recomendada=payload.get('solucion_recomendada'),
        estado=payload.get('estado', 'pendiente'),
    )
    db.session.add(diagnostico)
    db.session.commit()
    return diagnostico_to_dict(diagnostico), None, None


def register_trabajo(user, payload):
    """Registrar un trabajo asociado a un diagnostico."""
    from ..models import Diagnostico, Servicio
    diagnostico_id = payload.get('diagnostico_id')
    servicio_id = payload.get('servicio_id')

    # Verificar que el diagnostico existe y es del mecanico
    diagnostico = Diagnostico.query.filter_by(id=diagnostico_id).first()
    if not diagnostico: return None, 'Diagnostico no encontrado', 404
    if diagnostico.mecanico_id != user.id:
        return None, 'No tienes permisos para registrar trabajo en este diagnostico', 403

    # Verificar que el servicio existe
    servicio = db.session.get(Servicio, servicio_id)
    if not servicio: return None, 'Servicio no encontrado', 404

    from decimal import Decimal, InvalidOperation
    try:
        cantidad = int(payload.get('cantidad', 1))
        precio = Decimal(str(payload.get('precio', 0)))
        if cantidad < 1 or not precio.is_finite() or precio < 0 or precio > Decimal('99999999.99') or cantidad * precio > Decimal('99999999.99'):
            raise ValueError()
    except (ValueError, TypeError, InvalidOperation):
        return None, 'Cantidad o precio inválidos', 400
    if not (payload.get('descripcion') or '').strip() or payload.get('estado', 'pendiente') not in {'pendiente', 'en_proceso', 'completado', 'cancelado'}:
        return None, 'Descripción o estado inválidos', 400
    # Crear trabajo
    trabajo = Trabajo(
        diagnostico_id=diagnostico_id,
        servicio_id=servicio_id,
        mecanico_id=user.id,
        descripcion=payload.get('descripcion') or '',
        estado=payload.get('estado', 'pendiente'),
        fecha_inicio=payload.get('fecha_inicio'),
        fecha_fin=payload.get('fecha_fin'),
        cantidad=cantidad,
        precio=precio,
        subtotal=cantidad * precio,
    )
    db.session.add(trabajo)
    db.session.commit()
    return trabajo_to_dict(trabajo), None, None


def update_trabajo_status(user, trabajo_id, nuevo_estado):
    """Actualizar el estado de un trabajo."""
    from ..models import Trabajo
    trabajo = db.session.get(Trabajo, trabajo_id)
    if not trabajo: return None, 'Trabajo no encontrado', 404
    if trabajo.mecanico_id != user.id:
        return None, 'No tienes permisos para modificar este trabajo', 403
    valid_states = {'pendiente', 'en_proceso', 'completado', 'cancelado'}
    if nuevo_estado not in valid_states:
        return None, 'Estado inválido', 400
    if nuevo_estado == 'en_proceso' and not trabajo.fecha_inicio:
        trabajo.fecha_inicio = datetime.now()
    if nuevo_estado == 'completado':
        trabajo.fecha_fin = datetime.now()
    trabajo.estado = nuevo_estado
    db.session.commit()
    return trabajo_to_dict(trabajo), None, None


def upload_repair_image(user, payload, file):
    """Subir fotografia para un trabajo de reparacion usando imagenes_trabajo."""
    from ..models import Trabajo, Diagnostico
    trabajo_id = payload.get('trabajo_id')

    # Verificar que el trabajo existe y es del mecanico
    trabajo = db.session.get(Trabajo, trabajo_id)
    if not trabajo: return None, 'Trabajo no encontrado', 404
    # Verificar tramite el diagnostico
    diagnostico = db.session.get(Diagnostico, trabajo.diagnostico_id)
    if diagnostico.mecanico_id != user.id:
        return None, 'No tienes permisos para subir imagen a este trabajo', 403

    if not file or not file.filename:
        return None, 'No se selecciono ninguna imagen', 400

    import os, secrets
    from werkzeug.utils import secure_filename

    extension = os.path.splitext(file.filename)[1].lower()
    if extension not in {'.jpg', '.jpeg', '.png', '.webp'}:
        return None, 'La imagen debe ser JPG, PNG o WEBP', 400

    # Generar nombre de archivo unico
    filename = f'{user.id}-{trabajo_id}-{secrets.token_urlsafe(8)}{extension}'
    upload_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'uploads', 'reparaciones'
    )
    os.makedirs(upload_dir, exist_ok=True)

    # Guardar archivo
    file.save(os.path.join(upload_dir, filename))
    ruta_imagen = f'/uploads/reparaciones/{filename}'

    # Guardar en base de datos imagenes_trabajo
    from ..models import ImagenTrabajo
    imagen = ImagenTrabajo(
        trabajo_id=trabajo_id,
        usuario_id=user.id,
        ruta_imagen=ruta_imagen,
        descripcion=payload.get('descripcion') or '',
    )
    db.session.add(imagen)
    db.session.commit()

    return {
        'id': imagen.id,
        'ruta_imagen': imagen.ruta_imagen,
        'descripcion': imagen.descripcion,
        'created_at': imagen.created_at.isoformat() if imagen.created_at else None,
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

            for t in d_trabajos:
                cita_progress['trabajos'].append(trabajo_to_dict(t))

        progress.append(cita_progress)

    return progress, None, None
