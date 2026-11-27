"""SMTP delivery shared by notifications and password recovery."""
import json
import logging
import os
import smtplib
import ssl
import threading
import base64
import urllib.error
import urllib.parse
import urllib.request
from email.message import EmailMessage
from pathlib import Path
from html import escape

LOGO_PATH = Path(__file__).resolve().parents[1] / 'assets' / 'logo.png'


def branded_html(title, content):
    return f'''<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin:0;background:#e6dccd;font-family:Arial,sans-serif;color:#171717">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-top:6px solid #b52d2d">
    <tr><td align="center" style="padding:24px;background:#ffffff"><img src="cid:jenna-logo" width="180" alt="Jena Car Services" style="display:block;width:180px;max-width:100%;height:auto"></td></tr>
    <tr><td style="padding:20px 28px;background:#171717;color:#ffffff"><p style="margin:0 0 8px;color:#e6dccd;font-size:11px;letter-spacing:2px">JENA CAR SERVICES</p><h1 style="margin:0;font-size:24px;line-height:1.3">{escape(title)}</h1></td></tr>
    <tr><td style="padding:24px 20px;line-height:1.6;overflow-wrap:anywhere">{content}</td></tr>
    <tr><td style="padding:20px 28px;background:#f3f0eb;color:#5a514d;font-size:12px">Gracias por confiar en nuestro equipo.<br>Jena Car Services · Cuidamos de tu vehículo.</td></tr>
    </table></td></tr></table></body></html>'''

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
        'resend_api_key': os.getenv('RESEND_API_KEY', '').strip(),
        'gmail_client_id': os.getenv('GMAIL_API_CLIENT_ID', '').strip(),
        'gmail_client_secret': os.getenv('GMAIL_API_CLIENT_SECRET', '').strip(),
        'gmail_refresh_token': os.getenv('GMAIL_API_REFRESH_TOKEN', '').strip(),
    }


def correo_configurado():
    try:
        settings = mail_settings()
        api_ready = bool(settings['resend_api_key'] and settings['sender'])
        gmail_ready = bool(settings['gmail_client_id'] and settings['gmail_client_secret']
                           and settings['gmail_refresh_token'] and settings['sender'])
        smtp_ready = bool(settings['host'] and settings['username'] and settings['password'] and settings['sender'])
        return api_ready or gmail_ready or smtp_ready
    except ValueError:
        return False


def enviar_correo_async(destinatario, asunto, mensaje_html, imagenes=()):
    """Deliver synchronously by HTTPS API or SMTP; report provider acceptance."""
    if not correo_configurado():
        logger.error('Configuración SMTP incompleta o inválida')
        return False
    settings = mail_settings()
    html = branded_html(asunto, mensaje_html)
    gmail_oauth_ready = bool(settings['gmail_client_id'] and settings['gmail_client_secret']
                             and settings['gmail_refresh_token'])
    gmail_api_sender = os.getenv('GMAIL_API_SENDER', '').strip().lower()
    if gmail_oauth_ready and gmail_api_sender and settings['sender'].lower() == gmail_api_sender:
        try:
            token_request = urllib.request.Request(
                'https://oauth2.googleapis.com/token',
                data=urllib.parse.urlencode({
                    'client_id': settings['gmail_client_id'],
                    'client_secret': settings['gmail_client_secret'],
                    'refresh_token': settings['gmail_refresh_token'],
                    'grant_type': 'refresh_token',
                }).encode('ascii'),
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                method='POST',
            )
            with urllib.request.urlopen(token_request, timeout=15) as response:
                access_token = json.loads(response.read().decode('utf-8'))['access_token']

            msg = EmailMessage()
            msg['Subject'] = asunto
            msg['From'] = settings['sender']
            msg['To'] = destinatario
            msg.set_content('Abre este mensaje en un cliente compatible con HTML para consultar su contenido.')
            msg.add_alternative(html, subtype='html')
            mime_bytes = msg.as_bytes()
            gmail_request = urllib.request.Request(
                'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
                data=json.dumps({'raw': base64.urlsafe_b64encode(mime_bytes).decode('ascii')}).encode('utf-8'),
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json',
                },
                method='POST',
            )
            with urllib.request.urlopen(gmail_request, timeout=15) as response:
                if 200 <= response.status < 300:
                    logger.info('Gmail API aceptó el correo (status=%s)', response.status)
                    return True
                logger.error('Gmail API rechazó el correo (status=%s)', response.status)
                return False
        except urllib.error.HTTPError as error:
            detail = error.read(2048).decode('utf-8', errors='replace')
            logger.error('Gmail API rechazó el correo (status=%s, detalle=%s)', error.code, detail)
            return False
        except (urllib.error.URLError, TimeoutError, OSError, KeyError, ValueError) as error:
            logger.error('Fallo al enviar correo por Gmail API: %s', error)
            return False
    if settings['resend_api_key']:
        request = urllib.request.Request(
            'https://api.resend.com/emails',
            data=json.dumps({
                'from': settings['sender'],
                'to': [destinatario],
                'subject': asunto,
                'html': html,
            }).encode('utf-8'),
            headers={
                'Authorization': f"Bearer {settings['resend_api_key']}",
                'Content-Type': 'application/json',
            },
            method='POST',
        )
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                if 200 <= response.status < 300:
                    logger.info('Proveedor HTTPS aceptó el correo (proveedor=Resend, status=%s)', response.status)
                    return True
                logger.error('Proveedor HTTPS rechazó el correo (proveedor=Resend, status=%s)', response.status)
                return False
        except urllib.error.HTTPError as error:
            # The provider response explains actionable issues (for example,
            # an unverified sender). Never log response headers or API key.
            detail = error.read(2048).decode('utf-8', errors='replace')
            logger.error('Proveedor HTTPS rechazó el correo (proveedor=Resend, status=%s, detalle=%s)',
                         error.code, detail)
            return False
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            logger.error('Fallo al enviar correo por API HTTPS (proveedor=Resend, error=%s)', error)
            return False
    if os.getenv('RENDER') and settings['host'].lower() in {'smtp.gmail.com', 'smtp.googlemail.com'}:
        logger.error('Gmail SMTP no es accesible desde Render; configura Gmail API OAuth o un proveedor HTTPS')
        return False
    msg = EmailMessage()
    msg['Subject'] = asunto
    msg['From'] = settings['sender']
    msg['To'] = destinatario
    msg.set_content('Abre este mensaje en un cliente compatible con HTML para consultar su contenido.')
    msg.add_alternative(branded_html(asunto, mensaje_html), subtype='html')
    html_part = msg.get_payload()[-1]
    html_part.add_related(LOGO_PATH.read_bytes(), maintype='image', subtype='png',
                          cid='<jenna-logo>', disposition='inline', filename='jena-car.png')
    for cid, data, subtype in imagenes:
        html_part.add_related(data, maintype='image', subtype=subtype,
                              cid=f'<{cid}>', disposition='inline', filename=f'{cid}.{subtype}')
    try:
        context = ssl.create_default_context()
        modes = [(settings['port'], settings['ssl'], settings['tls'])]
        if settings['port'] == 587 and settings['tls'] and not settings['ssl']:
            modes.append((465, True, False))
        for index, (port, use_ssl, use_tls) in enumerate(modes):
            transport = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
            options = {'timeout': 15}
            if use_ssl:
                options['context'] = context
            try:
                with transport(settings['host'], port, **options) as server:
                    if use_tls and not use_ssl:
                        server.starttls(context=context)
                    server.login(settings['username'], settings['password'])
                    return not server.send_message(msg)
            except OSError:
                if index + 1 >= len(modes):
                    raise
                logger.warning('SMTP no accesible en puerto 587; intentando SSL en puerto 465')
    except (OSError, smtplib.SMTPException):
        logger.exception('No se pudo entregar correo por SMTP (host=%s, port=%s)', settings['host'], settings['port'])
        return False


def enviar_correo(destinatario, asunto, mensaje_html):
    """Queue notification delivery without holding the HTTP request."""
    if not correo_configurado():
        return False
    thread = threading.Thread(target=enviar_correo_async, args=(destinatario, asunto, mensaje_html), daemon=True)
    thread.start()
    return True
