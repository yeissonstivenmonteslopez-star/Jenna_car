import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import threading

def enviar_correo_async(destinatario, asunto, mensaje_html):
    remitente = os.environ.get('SMTP_EMAIL')
    password = os.environ.get('SMTP_PASSWORD')

    if not remitente or not password:
        print("Error: SMTP_EMAIL o SMTP_PASSWORD no están configurados.")
        return

    msg = MIMEMultipart('alternative')
    msg['Subject'] = asunto
    msg['From'] = remitente
    msg['To'] = destinatario

    parte_html = MIMEText(mensaje_html, 'html')
    msg.attach(parte_html)

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(remitente, password)
        server.sendmail(remitente, destinatario, msg.as_string())
        server.quit()
        print(f"Correo enviado a {destinatario} - Asunto: {asunto}")
    except Exception as e:
        print(f"Error al enviar correo a {destinatario}: {e}")

def enviar_correo(destinatario, asunto, mensaje_html):
    """Envía un correo de forma asíncrona para no bloquear el request principal."""
    thread = threading.Thread(target=enviar_correo_async, args=(destinatario, asunto, mensaje_html))
    thread.start()
