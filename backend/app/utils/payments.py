def payment_to_dict(payment):
    metodo = (payment.metodo_pago or 'otro').lower()
    nombre_metodo = 'Nequi' if metodo in {'otro', 'nequi', 'transferencia'} else metodo.capitalize()
    simulated = str(payment.referencia or '').startswith(('NEQUI-', 'SIM-'))
    if str(payment.referencia or '').startswith('SIM-'): nombre_metodo = 'Simulación'
    if metodo == 'mercado_pago': nombre_metodo = 'Mercado Pago'
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
        'simulacion': simulated,
        'mensaje': 'PAGO SIMULADO — NO ES UNA TRANSACCIÓN REAL' if simulated else 'Pago gestionado por Mercado Pago',
    }
