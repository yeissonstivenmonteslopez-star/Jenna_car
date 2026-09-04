from flask import Blueprint, request, jsonify
from ..extensions import db
from sqlalchemy import func
from ..models import Usuario, Cliente, Vehiculo, Cita, OrdenTrabajo, Recibo, Pago, Servicio
from ..services.security import jwt_required

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.get('')
@jwt_required(roles=['admin'])
def admin_dashboard():
    from datetime import datetime as _datetime
    from datetime import timezone as _timezone

    usuarios_count = db.session.query(func.count(Usuario.id)).scalar() or 0
    clientes_count = db.session.query(func.count(Cliente.id)).scalar() or 0
    vehiculos_count = db.session.query(func.count(Vehiculo.id)).scalar() or 0
    citas_pendientes = db.session.query(func.count(Cita.id)).filter(Cita.estado == 'pendiente').scalar() or 0
    citas_hoy = db.session.query(func.count(Cita.id)).filter(Cita.fecha == _datetime.now(_timezone.utc).date()).scalar() or 0
    ordenes_pendientes = db.session.query(func.count(OrdenTrabajo.id)).filter(OrdenTrabajo.estado == 'pendiente').scalar() or 0
    ordenes_reparacion = db.session.query(func.count(OrdenTrabajo.id)).filter(OrdenTrabajo.estado == 'en_reparacion').scalar() or 0
    ordenes_terminadas = db.session.query(func.count(OrdenTrabajo.id)).filter(OrdenTrabajo.estado == 'terminada').scalar() or 0
    recibos_pendientes = db.session.query(func.count(Recibo.id)).filter(Recibo.estado == 'pendiente').scalar() or 0
    recibos_pagados = db.session.query(func.count(Recibo.id)).filter(Recibo.estado == 'pagado').scalar() or 0
    ingresos_totales = db.session.query(func.coalesce(func.sum(Pago.monto), 0)).filter(Pago.estado == 'completado').scalar() or 0

    from ..models import Cita as CitaModel, OrdenTrabajo as OTModel
    citas_recientes = CitaModel.query.order_by(CitaModel.fecha.desc(), CitaModel.hora.desc()).limit(5).all()
    ordenes_recientes = OTModel.query.order_by(OTModel.created_at.desc(), OTModel.id.desc()).limit(5).all()

    from ..extensions import db as _db
    pagos_recientes = _db.session.query(Pago).filter_by(estado='completado').order_by(Pago.fecha_pago.desc(), Pago.id.desc()).limit(5).all()

    return jsonify({'data': {
        'usuarios': usuarios_count,
        'clientes': clientes_count,
        'vehiculos': vehiculos_count,
        'citas_pendientes': citas_pendientes,
        'citas_hoy': citas_hoy,
        'ordenes_pendientes': ordenes_pendientes,
        'ordenes_reparacion': ordenes_reparacion,
        'ordenes_terminadas': ordenes_terminadas,
        'recibos_pendientes': recibos_pendientes,
        'recibos_pagados': recibos_pagados,
        'ingresos_totales': float(ingresos_totales),
        'citas_recientes': [
            {
                'id': c.id,
                'fecha': str(c.fecha) if c.fecha else '',
                'hora': str(c.hora)[:5] if c.hora else '',
                'cliente': f'{c.cliente.usuario.nombre} {c.cliente.usuario.apellido}' if (c.cliente and c.cliente.usuario) else 'Sin cliente',
                'vehiculo': f'{c.vehiculo.marca} {c.vehiculo.modelo}' if c.vehiculo else 'Sin vehículo',
                'servicio': c.servicio.nombre if c.servicio else 'Sin servicio',
                'estado': c.estado,
            }
            for c in citas_recientes
        ],
        'ordenes_recientes': [
            {
                'id': o.id,
                'cliente': f'{o.cliente.usuario.nombre} {o.cliente.usuario.apellido}' if (o.cliente and o.cliente.usuario) else 'Sin cliente',
                'vehiculo': f'{o.vehiculo.marca} {o.vehiculo.modelo} ({o.vehiculo.placa})' if o.vehiculo else 'Sin vehículo',
                'estado': o.estado,
                'total': float(o.total),
                'fecha_ingreso': o.fecha_ingreso.strftime('%Y-%m-%d %H:%M') if o.fecha_ingreso else '',
            }
            for o in ordenes_recientes
        ],
        'pagos_recientes': [
            {
                'id': p.id,
                'referencia': p.referencia or f'PAGO-{p.id}',
                'cliente': f'{p.recibo.orden_trabajo.cliente.usuario.nombre} {p.recibo.orden_trabajo.cliente.usuario.apellido}' if (p.recibo and p.recibo.orden_trabajo and p.recibo.orden_trabajo.cliente and p.recibo.orden_trabajo.cliente.usuario) else 'Cliente',
                'metodo_pago': (p.metodo_pago or 'Nequi').capitalize(),
                'monto': float(p.monto),
                'fecha_pago': p.fecha_pago.strftime('%Y-%m-%d %H:%M') if p.fecha_pago else '',
            }
            for p in pagos_recientes
        ],
    }})
