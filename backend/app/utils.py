import re
from decimal import Decimal
from datetime import datetime


def validar_placa(placa: str) -> str:
    placa_normalizada = (placa or '').strip().upper()
    placa_normalizada = re.sub(r'[^A-Z0-9]', '', placa_normalizada)
    if not placa_normalizada:
        raise ValueError('La placa es obligatoria.')
    PLACA_PATTERN = re.compile(r'^[A-Z]{3}[0-9]{3}$')
    if not PLACA_PATTERN.fullmatch(placa_normalizada):
        raise ValueError('La placa debe tener exactamente 3 letras y 3 números.')
    return placa_normalizada


def validar_hora_cita(hora: str):
    try:
        hora_obj = datetime.strptime(str(hora), '%H:%M:%S').time()
    except ValueError:
        try:
            hora_obj = datetime.strptime(str(hora), '%H:%M').time()
        except ValueError:
            raise ValueError('La hora debe tener formato HH:MM o HH:MM:SS')

    if hora_obj > datetime.strptime('19:00', '%H:%M').time():
        raise ValueError('No se pueden agendar citas después de las 19:00.')

    return hora_obj


def validar_fecha_cita(fecha: str, *, permitir_pasada: bool = False):
    try:
        fecha_obj = datetime.strptime(str(fecha), '%Y-%m-%d').date()
    except (TypeError, ValueError):
        raise ValueError('La fecha debe tener formato YYYY-MM-DD')
    if not permitir_pasada and fecha_obj < datetime.now().date():
        raise ValueError('No se pueden crear citas en fechas pasadas')
    return fecha_obj


# Helper functions migrated from app.py for use by blueprints

def vehicle_to_dict(vehicle):
    from .models import Cliente
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


def order_to_dict(order):
    if order and not order.recibo and order.id:
        try:
            from .utils import asegurar_recibo_orden
            asegurar_recibo_orden(order, do_commit=True)
        except Exception:
            from . import db as _db
            _db.session.rollback()

    recibo_data = None
    if order and order.recibo:
        recibo_data = {
            'id': order.recibo.id,
            'estado': order.recibo.estado,
            'subtotal': float(order.recibo.subtotal),
            'total': float(order.recibo.total),
        }

    return {
        'id': order.id,
        'cliente': {
            'id': order.cliente.id,
            'nombre': order.cliente.usuario.nombre,
            'apellido': order.cliente.usuario.apellido,
        },
        'vehiculo': {
            'id': order.vehiculo.id,
            'marca': order.vehiculo.marca,
            'modelo': order.vehiculo.modelo,
            'placa': order.vehiculo.placa,
        },
        'fecha_ingreso': order.fecha_ingreso.isoformat() if order.fecha_ingreso else None,
        'fecha_entrega': order.fecha_entrega.isoformat() if order.fecha_entrega else None,
        'kilometraje': order.kilometraje,
        'problema_reportado': order.problema_reportado,
        'diagnostico': order.diagnostico,
        'trabajo_realizado': order.trabajo_realizado,
        'observaciones': order.observaciones,
        'estado': order.estado,
        'subtotal': float(order.subtotal),
        'total': float(order.total),
        'recibo': recibo_data,
        'servicios': [
            {
                'id': item.id,
                'servicio_id': item.servicio_id,
                'nombre': item.servicio.nombre,
                'cantidad': item.cantidad,
                'precio': float(item.precio),
                'subtotal': float(item.subtotal),
            }
            for item in order.ordenes_servicios
        ],
    }


def asegurar_recibo_orden(orden, do_commit=False):
    from .models import Recibo
    from .extensions import db as _db

    if not orden or not orden.id:
        return None
    recibo = Recibo.query.filter_by(orden_id=orden.id).first()
    subtotal = Decimal(str(orden.subtotal or 0.00))
    total = Decimal(str(orden.total or 0.00))
    descuento = max(subtotal - total, Decimal('0.00'))
    if not recibo:
        recibo = Recibo(
            orden_id=orden.id,
            cliente_id=orden.cliente_id,
            fecha_emision=datetime.now(),
            subtotal=subtotal,
            descuento=descuento,
            total=total,
            estado='pendiente',
        )
        _db.session.add(recibo)
    else:
        recibo.cliente_id = orden.cliente_id
        recibo.subtotal = subtotal
        recibo.descuento = descuento
        recibo.total = total
    if do_commit:
        _db.session.commit()
    return recibo


def apply_order_services(order, service_items):
    from .models import OrdenServicio, Servicio
    from . import db as _db
    order.ordenes_servicios.clear()
    subtotal = Decimal('0.00')
    for item in service_items or []:
        service = _db.session.get(Servicio, item.get('servicio_id'))
        quantity = int(item.get('cantidad', 1))
        if not service or service.estado != 'activo' or quantity < 1:
            raise ValueError('Servicio o cantidad inválidos')
        from decimal import Decimal as _Decimal
        price = _Decimal(str(item.get('precio', service.precio)))
        line_total = price * quantity
        order.ordenes_servicios.append(OrdenServicio(
            servicio=service,
            cantidad=quantity,
            precio=price,
            subtotal=line_total,
        ))
        subtotal += line_total
    order.subtotal = subtotal
    order.total = subtotal


def notificacion_por_usuario(usuario_id, titulo, mensaje, tipo='sistema', link=None, do_commit=True):
    from .models import Notificacion
    from . import db as _db
    notificacion = Notificacion.crear(
        usuario_id=usuario_id,
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo,
        link=link,
        do_commit=do_commit,
    )
    if do_commit:
        _db.session.commit()
    return notificacion


def payment_to_dict(payment):
    from decimal import Decimal as _Decimal
    metodo = (payment.metodo_pago or 'otro').lower()
    nombre_metodo = 'Nequi' if metodo in {'otro', 'nequi', 'transferencia'} else metodo.capitalize()
    orden_id = payment.recibo.orden_id if payment.recibo else None
    recibo_obj = {
        'id': payment.recibo_id,
        'orden_id': orden_id,
        'estado': payment.recibo.estado if payment.recibo else None,
    } if payment.recibo else {'id': payment.recibo_id, 'orden_id': None, 'estado': None}
    return {
        'id': payment.id,
        'recibo_id': payment.recibo_id,
        'orden_id': orden_id,
        'recibo': recibo_obj,
        'orden': {'id': orden_id} if orden_id else None,
        'monto': float(payment.monto),
        'metodo_pago': nombre_metodo,
        'referencia': payment.referencia,
        'estado': payment.estado,
        'fecha_pago': payment.fecha_pago.isoformat() if payment.fecha_pago else None,
        'simulacion': True,
        'mensaje': 'PAGO SIMULADO — NO ES UNA TRANSACCIÓN REAL',
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
