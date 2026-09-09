from sqlalchemy import String

from ..models import Cliente, Cita, OrdenTrabajo, Recibo, Usuario, Vehiculo


def buscar_admin(query, type_filter):
    results = {}
    if type_filter in {'', 'cliente'}:
        clients = Cliente.query.join(Usuario).filter((Usuario.nombre.ilike(f'%{query}%')) | (Cliente.documento.ilike(f'%{query}%')) | (Usuario.email.ilike(f'%{query}%'))).all()
        results['clientes'] = [{'id': c.id, 'nombre': c.usuario.nombre, 'apellido': c.usuario.apellido, 'documento': c.documento, 'email': c.usuario.email, 'telefono': c.usuario.telefono} for c in clients]
    if type_filter in {'', 'vehiculo'}:
        vehicles = Vehiculo.query.filter((Vehiculo.placa.ilike(f'%{query}%')) | (Vehiculo.marca.ilike(f'%{query}%')) | (Vehiculo.modelo.ilike(f'%{query}%'))).all()
        results['vehiculos'] = [{'id': v.id, 'placa': v.placa, 'marca': v.marca, 'modelo': v.modelo, 'anio': v.anio, 'cliente_id': v.cliente_id} for v in vehicles]
    if type_filter in {'', 'orden'}:
        orders = OrdenTrabajo.query.join(OrdenTrabajo.cliente).join(Cliente.usuario).join(OrdenTrabajo.vehiculo).filter((OrdenTrabajo.id.cast(String).ilike(f'%{query}%')) | (Vehiculo.placa.ilike(f'%{query}%')) | (Usuario.nombre.ilike(f'%{query}%')) | (OrdenTrabajo.estado.ilike(f'%{query}%'))).all()
        results['órdenes'] = [{'id': o.id, 'cliente': f'{o.cliente.usuario.nombre} {o.cliente.usuario.apellido}', 'vehiculo_placa': o.vehiculo.placa, 'estado': o.estado} for o in orders]
    if type_filter in {'', 'cita'}:
        appointments = Cita.query.join(Cliente).join(Usuario).filter((Usuario.nombre.ilike(f'%{query}%')) | (Cita.estado.ilike(f'%{query}%')) | (Cita.fecha.cast(String).ilike(f'%{query}%'))).all()
        results['citas'] = [{'id': a.id, 'cliente': f'{a.cliente.usuario.nombre} {a.cliente.usuario.apellido}', 'vehiculo_placa': a.vehiculo.placa, 'fecha': str(a.fecha), 'hora': str(a.hora), 'estado': a.estado} for a in appointments]
    if type_filter in {'', 'recibo'}:
        receipts = Recibo.query.join(OrdenTrabajo).join(Cliente).join(Usuario).filter((OrdenTrabajo.id.cast(String).ilike(f'%{query}%')) | (Usuario.nombre.ilike(f'%{query}%')) | (Recibo.estado.ilike(f'%{query}%'))).all()
        results['recibos'] = [{'id': r.id, 'orden_id': r.orden_id, 'cliente': f'{r.orden_trabajo.cliente.usuario.nombre} {r.orden_trabajo.cliente.usuario.apellido}', 'estado': r.estado, 'fecha_emision': r.fecha_emision.isoformat() if r.fecha_emision else None} for r in receipts]
    return results