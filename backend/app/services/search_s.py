from sqlalchemy import String, or_

from ..models import Cita, OrdenTrabajo, Recibo, Usuario, Vehiculo


def buscar_admin(query, type_filter):
    results = {}
    if type_filter in {'', 'cliente'}:
        clients = Usuario.query.filter(
            Usuario.rol == 'usuario',
            or_(Usuario.nombre.ilike(f'%{query}%'), Usuario.apellido.ilike(f'%{query}%'), Usuario.documento.ilike(f'%{query}%'), Usuario.email.ilike(f'%{query}%')),
        ).all()
        results['clientes'] = [{'id': c.id, 'nombre': c.nombre, 'apellido': c.apellido, 'documento': c.documento, 'email': c.email, 'telefono': c.telefono} for c in clients]
    if type_filter in {'', 'vehiculo'}:
        vehicles = Vehiculo.query.filter((Vehiculo.placa.ilike(f'%{query}%')) | (Vehiculo.marca.ilike(f'%{query}%')) | (Vehiculo.modelo.ilike(f'%{query}%'))).all()
        results['vehiculos'] = [{'id': v.id, 'placa': v.placa, 'marca': v.marca, 'modelo': v.modelo, 'anio': v.anio, 'cliente_id': v.cliente_id} for v in vehicles]
    if type_filter in {'', 'orden'}:
        orders = OrdenTrabajo.query.join(OrdenTrabajo.vehiculo).join(Vehiculo.cliente).filter((OrdenTrabajo.id.cast(String).ilike(f'%{query}%')) | (Vehiculo.placa.ilike(f'%{query}%')) | (Usuario.nombre.ilike(f'%{query}%')) | (OrdenTrabajo.estado.ilike(f'%{query}%'))).all()
        results['órdenes'] = [{'id': o.id, 'cliente': f'{o.vehiculo.cliente.nombre} {o.vehiculo.cliente.apellido}', 'vehiculo_placa': o.vehiculo.placa, 'estado': o.estado} for o in orders]
    if type_filter in {'', 'cita'}:
        appointments = Cita.query.join(Cita.vehiculo).join(Vehiculo.cliente).filter((Usuario.nombre.ilike(f'%{query}%')) | (Cita.estado.ilike(f'%{query}%')) | (Cita.fecha.cast(String).ilike(f'%{query}%'))).all()
        results['citas'] = [{'id': a.id, 'cliente': f'{a.cliente.nombre} {a.cliente.apellido}', 'vehiculo_placa': a.vehiculo.placa, 'fecha': str(a.fecha), 'hora': str(a.hora), 'estado': a.estado} for a in appointments]
    if type_filter in {'', 'recibo'}:
        receipts = Recibo.query.join(Recibo.orden_trabajo).join(OrdenTrabajo.vehiculo).join(Vehiculo.cliente).filter((OrdenTrabajo.id.cast(String).ilike(f'%{query}%')) | (Usuario.nombre.ilike(f'%{query}%')) | (Recibo.estado.ilike(f'%{query}%'))).all()
        results['recibos'] = [{'id': r.id, 'orden_id': r.orden_id, 'cliente': f'{r.orden_trabajo.vehiculo.cliente.nombre} {r.orden_trabajo.vehiculo.cliente.apellido}', 'estado': r.estado, 'fecha_emision': r.fecha_emision.isoformat() if r.fecha_emision else None} for r in receipts]
    return results