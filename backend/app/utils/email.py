"""SMTP delivery shared by notifications and password recovery."""
import logging
import os
import smtplib
import ssl
import threading
from email.message import EmailMessage

logger = logging.getLogger(__name__)


def mail_settings():
    username = os.getenv('MAIL_USERNAME') or os.getenv('SMTP_EMAIL', '')
    return {
        'host': os.getenv('MAIL_HOST', 'smtp.gmail.com'),
        'port': int(os.getenv('MAIL_PORT', '587')),
        'username': username,
        'password': os.getenv('MAIL_PASSWORD') or os.getenv('SMTP_PASSWORD', ''),
        'sender': os.getenv('MAIL_FROM') or username,
        'tls': os.getenv('MAIL_USE_TLS', 'true').lower() in {'1', 'true', 'yes'},
        'ssl': os.getenv('MAIL_USE_SSL', 'false').lower() in {'1', 'true', 'yes'},
    }


def correo_configurado():
    try:
        settings = mail_settings()
        return bool(settings['host'] and settings['username'] and settings['password'] and settings['sender'])
    except ValueError:
        return False


def enviar_correo_async(destinatario, asunto, mensaje_html):
    """Deliver synchronously and report SMTP acceptance, not inbox delivery."""
    if not correo_configurado():
        logger.error('Configuración SMTP incompleta o inválida')
        return False
    settings = mail_settings()
    msg = EmailMessage()
    msg['Subject'] = asunto
    msg['From'] = settings['sender']
    msg['To'] = destinatario
    msg.set_content('Abre este mensaje en un cliente compatible con HTML para consultar su contenido.')
    msg.add_alternative(mensaje_html, subtype='html')
    try:
        context = ssl.create_default_context()
        transport = smtplib.SMTP_SSL if settings['ssl'] else smtplib.SMTP
        options = {'timeout': 15}
        if settings['ssl']:
            options['context'] = context
        with transport(settings['host'], settings['port'], **options) as server:
            if settings['tls'] and not settings['ssl']:
                server.starttls(context=context)
            server.login(settings['username'], settings['password'])
            return not server.send_message(msg)
    except (OSError, smtplib.SMTPException):
        logger.error('No se pudo entregar el correo al servidor SMTP')
        return False


def enviar_correo(destinatario, asunto, mensaje_html):
    """Queue notification delivery without holding the HTTP request."""
    if not correo_configurado():
        return False
    thread = threading.Thread(target=enviar_correo_async, args=(destinatario, asunto, mensaje_html), daemon=True)
    thread.start()
    return True
