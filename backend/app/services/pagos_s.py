"""Payment queries and simulated payment workflow."""
from datetime import datetime, timezone
import re, secrets
from ..extensions import db
from ..models import Cliente, OrdenTrabajo, Pago, Recibo, Usuario
from ..utils.notifications import notificacion_por_usuario
from ..utils.payments import payment_to_dict

def admin_list(filters):
    query, reference, client, state, date = (filters.get(key, '') for key in ('q', 'referencia', 'cliente', 'estado', 'fecha'))
    base = Pago.query.join(Recibo).join(OrdenTrabajo).join(Cliente).join(Usuario)
    if query: base = base.filter((Pago.referencia.ilike(f'%{query}%')) | (Usuario.nombre.ilike(f'%{query}%')) | (Usuario.apellido.ilike(f'%{query}%')) | (Usuario.email.ilike(f'%{query}%')))
    if reference: base = base.filter(Pago.referencia.ilike(f'%{reference}%'))
    if client: base = base.filter((Usuario.nombre.ilike(f'%{client}%')) | (Usuario.apellido.ilike(f'%{client}%')) | (Usuario.email.ilike(f'%{client}%')))
    if state: base = base.filter(Pago.estado.ilike(f'%{state}%'))
    if date: base = base.filter(db.func.date(Pago.fecha_pago) == date)
    return [payment_to_dict(item) for item in base.order_by(Pago.fecha_pago.desc(), Pago.id.desc()).all()]
def get(payment_id): return db.session.get(Pago, payment_id)
def create(user, payload):
    receipt_id = payload.get('recibo_id'); number = str(payload.get('numero_nequi') or '').strip()
    if not receipt_id: return None, 'El recibo es obligatorio', 400
    if not re.fullmatch(r'3\d{9}', number): return None, 'Ingresa un número de Nequi válido de 10 dígitos', 400
    client = Cliente.query.filter_by(usuario_id=user.id).first()
    if not client: return None, 'No tienes un perfil de cliente asociado', 403
    receipt = Recibo.query.filter_by(id=int(receipt_id), cliente_id=client.id).first()
    if not receipt: return None, 'Recibo no encontrado', 404
    if receipt.estado == 'pagado': return None, 'Este recibo ya fue pagado', 409
    reference = f'NEQUI-{secrets.token_hex(8).upper()}'
    payment = Pago(recibo_id=receipt.id, usuario_id=user.id, monto=receipt.total, metodo_pago='nequi', numero_nequi=number[-4:], referencia=reference, estado='completado', fecha_pago=datetime.now(timezone.utc))
    db.session.add(payment)
    try: db.session.commit()
    except Exception: db.session.rollback(); return None, 'Conflicto al registrar el pago. Inténtalo de nuevo.', 409
    receipt.estado = 'pagado'
    try: db.session.commit()
    except Exception: db.session.rollback(); return None, 'Error al actualizar el recibo', 409
    result = payment_to_dict(payment); result['mensaje'] = 'Pago simulado registrado correctamente. PAGO SIMULADO — NO ES UNA TRANSACCIÓN REAL'
    notificacion_por_usuario(user.id, 'Pago registrado', f'El pago de ${float(receipt.total):.2f} ha sido registrado correctamente. Referencia: {reference}.', tipo='pago', link=f'/recibos/{receipt.orden_id}')
    return result, None, 201
def get_for_user(user_id, payment_id):
    client = Cliente.query.filter_by(usuario_id=user_id).first()
    payment = db.session.query(Pago).join(Recibo).filter(Pago.id == payment_id, Recibo.cliente_id == (client.id if client else None)).first()
    return (payment_to_dict(payment), None, None) if payment else (None, 'Pago no encontrado', 404)
def list_for_user(user_id):
    client = Cliente.query.filter_by(usuario_id=user_id).first()
    if not client: return None, 'No tienes un perfil de cliente asociado', 403
    return [payment_to_dict(item) for item in Pago.query.join(Recibo).filter(Recibo.cliente_id == client.id).order_by(Pago.fecha_pago.desc(), Pago.id.desc()).all()], None, None
