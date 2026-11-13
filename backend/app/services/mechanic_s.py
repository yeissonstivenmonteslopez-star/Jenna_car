"""Mechanic write operations and public service entrypoints."""
from ..utils.money import format_cop
from ..extensions import db
from ..models import Cita, Servicio, Diagnostico, Trabajo, ImagenTrabajo, OrdenTrabajo, ReciboDetalle
from ..schemas.serializers import diagnostico_to_dict, trabajo_to_dict
from ..utils.notifications import notificacion_por_usuario
from .mechanic_queries import (
    mechanic_dashboard as mechanic_dashboard,
    mechanic_appointments as mechanic_appointments,
    mechanic_appointment_detail as mechanic_appointment_detail,
    mechanic_works_history as mechanic_works_history,
    client_repair_progress as client_repair_progress,
)


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

    cita = diagnostico.cita
    if not cita:
        return None, 'La cita del diagnóstico no existe', 404
    order_id = payload.get('orden_id')
    if order_id:
        order = db.session.get(OrdenTrabajo, order_id)
        if not order or order.vehiculo_id != cita.vehiculo_id:
            return None, 'La orden no corresponde al vehículo de la cita', 400
        if order.estado in {'cancelada', 'entregada'}:
            return None, 'La orden ya no está activa', 409
    else:
        active_orders = OrdenTrabajo.query.filter(
            OrdenTrabajo.vehiculo_id == cita.vehiculo_id,
            ~OrdenTrabajo.estado.in_({'cancelada', 'entregada'}),
        ).order_by(OrdenTrabajo.created_at.desc(), OrdenTrabajo.id.desc()).all()
        if not active_orders:
            return None, 'No hay una orden activa para este vehículo. Solicita crearla desde administración.', 409
        if len(active_orders) > 1:
            return None, 'Hay varias órdenes activas para este vehículo. Selecciona una orden antes de registrar el trabajo.', 409
        order = active_orders[0]

    # Verificar que el servicio existe
    servicio = db.session.get(Servicio, servicio_id)
    if not servicio: return None, 'Servicio no encontrado', 404
    if servicio.estado != 'activo': return None, 'El servicio seleccionado no está disponible', 409

    from decimal import Decimal, InvalidOperation
    try:
        cantidad = int(payload.get('cantidad', 1))
        precio = Decimal(str(payload.get('precio', 0)))
        if cantidad < 1 or not precio.is_finite() or precio < 0 or precio > Decimal('99999999.99') or cantidad * precio > Decimal('99999999.99'):
            raise ValueError()
    except (ValueError, TypeError, InvalidOperation):
        return None, 'Cantidad o precio inválidos', 400
    initial_state = payload.get('estado', 'pendiente')
    if not (payload.get('descripcion') or '').strip() or initial_state not in {'pendiente', 'en_proceso', 'completado', 'cancelado'}:
        return None, 'Descripción o estado inválidos', 400
    if order.estado_aprobacion != 'aprobado' and initial_state != 'pendiente':
        return None, 'El cliente debe aprobar la cotización antes de iniciar el trabajo', 409
    from ..utils.orders import asegurar_recibo_orden
    if order.recibo and order.recibo.estado != 'pendiente':
        return None, 'El recibo de esta orden ya no está pendiente de cobro', 409
    receipt = asegurar_recibo_orden(order)
    if receipt.estado != 'pendiente':
        return None, 'El recibo de esta orden ya no está pendiente de cobro', 409
    line_total = cantidad * precio
    previous_subtotal = Decimal(str(order.subtotal or 0))
    previous_total = Decimal(str(order.total or 0))
    trabajo = Trabajo(
        diagnostico_id=diagnostico_id,
        servicio_id=servicio_id,
        mecanico_id=user.id,
        orden_id=order.id,
        descripcion=payload.get('descripcion') or '',
        estado=payload.get('estado', 'pendiente'),
        fecha_inicio=payload.get('fecha_inicio'),
        fecha_fin=payload.get('fecha_fin'),
        cantidad=cantidad,
        precio=precio,
        subtotal=line_total,
    )
    db.session.add(trabajo)
    db.session.flush()
    receipt.detalles.append(ReciboDetalle(
        descripcion=f'{servicio.nombre}: {trabajo.descripcion}'[:255],
        cantidad=cantidad,
        precio_unitario=precio,
        subtotal=line_total,
    ))
    order.subtotal = previous_subtotal + line_total
    order.total = max(previous_total + line_total, Decimal('0.00'))
    order.estado_aprobacion = 'pendiente'
    receipt.subtotal = order.subtotal
    receipt.total = order.total
    receipt.descuento = max(order.subtotal - order.total, Decimal('0.00'))
    receipt.enviado_cliente = False
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return None, 'No fue posible registrar el trabajo y actualizar el recibo.', 409
    notificacion_por_usuario(
        cita.vehiculo.usuario_id,
        f'Diagnóstico y cotización de la orden #{order.id}',
        f'El mecánico registró observaciones y una cotización por {format_cop(order.total)}. '
        'Revisa los detalles y aprueba o rechaza el trabajo.',
        tipo='diagnostico',
        link='/mis-reparaciones',
    )
    return trabajo_to_dict(trabajo), None, None



def update_trabajo_status(user, trabajo_id, nuevo_estado):
    from .repair_updates import publish
    data, error, status = publish(user, trabajo_id, {'estado': nuevo_estado})
    return (None, error, status) if error else (data['trabajo'], None, None)



def upload_repair_image(user, payload, file):
    from .repair_updates import publish
    if not file or not file.filename:
        return None, 'No se seleccionó ninguna imagen', 400
    data, error, status = publish(user, payload.get('trabajo_id'), payload, [file])
    if error:
        return None, error, status
    image = ImagenTrabajo.query.filter_by(trabajo_id=payload['trabajo_id']).order_by(ImagenTrabajo.id.desc()).first()
    return {'id': image.id, 'ruta_imagen': image.ruta_imagen, 'descripcion': image.descripcion,
            'created_at': image.created_at.isoformat() if image.created_at else None,
            'correo_enviado': data.get('correo_enviado'), 'notificacion_id': data.get('notificacion_id')}, None, None
