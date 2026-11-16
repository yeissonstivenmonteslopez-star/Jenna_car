"""Persist payment alerts in the payment transaction; email only after commit."""
import logging
from html import escape

from ..extensions import db
from ..models import Notificacion, Usuario
from ..utils.email import enviar_correo
from ..utils.money import format_cop

logger = logging.getLogger(__name__)


def prepare_simulated_payment_notifications(user, receipt, reference):
    """Return plain email data, avoiding expired ORM objects after commit."""
    detail = f'Recibo #{receipt.id} · {format_cop(receipt.total)} · Referencia {reference}.'
    disclaimer = 'Simulación: no se ha cobrado dinero real.'
    name = f"{getattr(user, 'nombre', '')} {getattr(user, 'apellido', '')}".strip() or 'Cliente'
    recipients = [(user, 'Pago simulado exitoso', f'{detail} {disclaimer}', '/mis-recibos')]
    admins = Usuario.query.filter_by(rol='admin', estado='activo').all()
    recipients.extend((admin, 'Pago simulado recibido', f'{name} registró un pago. {detail} {disclaimer}', '/admin/orders')
                      for admin in admins if admin.id != user.id)
    emails = []
    for recipient, title, message, link in recipients:
        db.session.add(Notificacion(usuario_id=recipient.id, titulo=title, mensaje=message,
                                    tipo='pago', leida=False, link=link))
        if getattr(recipient, 'email', None):
            emails.append((recipient.email, title, message))
    return emails


def send_payment_notification_emails(emails):
    """SMTP failure must never turn a committed payment into a failed checkout."""
    for address, title, message in emails:
        try:
            accepted = enviar_correo(address, f'{title} | Jenna Car',
                f'<h2 style="color:#b52d2d">{escape(title)}</h2><p>{escape(message)}</p>')
            if not accepted:
                logger.warning('Aviso de pago guardado; correo no encolado')
        except Exception:
            logger.exception('Aviso de pago guardado; no se pudo encolar el correo')
