"""Publish current observations and dated photographs in existing tables."""
from datetime import datetime, timezone
from html import escape
from pathlib import Path
import secrets
import os
from urllib.parse import parse_qs, urlencode, urlsplit
from io import BytesIO
from PIL import Image
from flask import current_app
from ..utils.images import prepare_photo
from ..extensions import db
from ..models import Trabajo, ImagenTrabajo, Notificacion
from ..utils.email import enviar_correo_async
from ..schemas.serializers import trabajo_to_dict
from .schema_compat import column_exists

UPLOAD_DIR = Path(os.getenv('UPLOAD_ROOT') or Path(__file__).resolve().parents[1] / 'uploads') / 'reparaciones'
STATES = {'pendiente', 'en_proceso', 'completado', 'cancelado'}



def deliver(notification_id, mechanic):
    notification = Notificacion.query.filter_by(id=notification_id).with_for_update().populate_existing().first()
    if not notification or notification.tipo not in {'avance_correo_pendiente', 'avance_correo_enviado'}:
        db.session.rollback()
        return None, 'Notificación no encontrada', 404
    # The publication records its author in its title; clients cannot retry mail.
    if not notification.titulo.endswith(f'[M{mechanic.id}]'):
        db.session.rollback()
        return None, 'Notificación no encontrada', 404
    if notification.tipo == 'avance_correo_enviado':
        db.session.rollback()
        return {'correo_enviado': True}, None, 200
    from ..models import Usuario
    customer = db.session.get(Usuario, notification.usuario_id)
    origin = current_app.config['CORS_ORIGINS'][0].rstrip('/')
    images = []
    gallery = ''
    # Persist exact publication image IDs in the existing notification link so
    # retries never include photographs from a later update.
    ids = parse_qs(urlsplit(notification.link or '').query).get('foto', [])[:6]
    for value in ids:
        if not value.isdecimal():
            continue
        photo = ImagenTrabajo.query.filter_by(id=int(value), usuario_id=mechanic.id).first()
        if not photo or photo.trabajo.diagnostico.cita.vehiculo.usuario_id != customer.id:
            continue
        path = UPLOAD_DIR / Path(photo.ruta_imagen).name
        # JPEG works in email clients that cannot display WEBP. Limit message size.
        with Image.open(path) as source:
            source.thumbnail((1200, 1200))
            output = BytesIO()
            source.convert('RGB').save(output, format='JPEG', quality=82)
        cid = f'avance-{photo.id}'
        images.append((cid, output.getvalue(), 'jpeg'))
        gallery += f'<p><img src="cid:{cid}" width="520" alt="Fotografía del avance" style="display:block;width:100%;max-width:520px;height:auto;border-radius:8px"></p>'
    html = f'''<div style="font-family:Arial;color:#171717;max-width:600px;margin:auto;border-top:5px solid #dc2626;padding:24px">
    <h1>Avance de reparación · Jenna Car</h1><p>Hola {escape(customer.nombre)},</p>
    <p style="white-space:pre-wrap">{escape(notification.mensaje)}</p>
    <p>Publicado: {escape(str(notification.created_at))} UTC</p>
    {gallery}
    <p><a style="color:#b52d2d" href="{escape(origin, quote=True)}/mis-reparaciones">Ver el seguimiento de mi vehículo</a></p></div>'''
    current_app.logger.info('Intento de correo de avance %s', notification.id)
    sent = enviar_correo_async(customer.email, 'Avance de tu vehículo | Jenna Car', html, images)
    if sent:
        notification.tipo = 'avance_correo_enviado'
        db.session.commit()
    else:
        db.session.rollback()
        current_app.logger.warning('Correo pendiente para avance %s', notification_id)
    return {'correo_enviado': bool(sent), 'notificacion_id': notification_id}, None, 200


def publish(user, work_id, payload, files=()):
    work = Trabajo.query.filter_by(id=work_id).with_for_update().populate_existing().first()
    if not work or work.mecanico_id != user.id:
        db.session.rollback()
        return None, 'Trabajo no encontrado', 404
    state = payload.get('estado', work.estado)
    note = payload.get('observaciones', payload.get('descripcion', ''))
    if not isinstance(note, str) or len(note.strip()) > 255 or state not in STATES:
        db.session.rollback()
        return None, 'Estado u observación inválidos (máximo 255 caracteres)', 400
    note = note.strip()
    approval_required = column_exists('ordenes_trabajo', 'estado_aprobacion')
    if approval_required and state in {'en_proceso', 'completado'} and work.orden and work.orden.estado_aprobacion != 'aprobado':
        db.session.rollback()
        return None, 'El cliente debe aprobar la cotización antes de iniciar el trabajo', 409
    if not files and state == work.estado and (not note or note == (work.diagnostico.observaciones or '')):
        db.session.rollback()
        return {'trabajo': trabajo_to_dict(work), 'sin_cambios': True}, None, 200
    saved = []
    try:
        if len(files) > 6:
            raise ValueError('Adjunta como máximo seis fotografías')
        photos = [prepare_photo(file) for file in files]
        now = datetime.now(timezone.utc)
        if state == 'en_proceso' and not work.fecha_inicio:
            work.fecha_inicio = now
        if state == 'completado' and work.estado != 'completado':
            work.fecha_fin = now
        work.estado = state
        work.updated_at = now
        if note:
            # Existing field stores the current observation, not a fabricated history.
            work.diagnostico.observaciones = note
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        published_photos = []
        for data, extension in photos:
            path = UPLOAD_DIR / f'{user.id}-{work.id}-{secrets.token_hex(16)}{extension}'
            path.write_bytes(data)
            saved.append(path)
            photo = ImagenTrabajo(trabajo_id=work.id, usuario_id=user.id,
                ruta_imagen=f'/uploads/reparaciones/{path.name}', descripcion=note or 'Avance de reparación')
            db.session.add(photo)
            published_photos.append(photo)
        db.session.flush()
        params = [('orden', work.orden_id)] if work.orden_id else []
        params.extend(('foto', photo.id) for photo in published_photos)
        query = urlencode(params)
        vehicle = work.diagnostico.cita.vehiculo
        notification = Notificacion(usuario_id=vehicle.usuario_id,
            titulo=f'Avance de {vehicle.placa} [M{user.id}]',
            mensaje=f'Vehículo {vehicle.placa} · Trabajo #{work.id}\nEstado: {state}\n{note}\nFotografías adjuntas: {len(photos)}',
            tipo='avance_correo_pendiente', link='/mis-reparaciones' + (f'?{query}' if query else ''))
        db.session.add(notification)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        for path in saved:
            path.unlink(missing_ok=True)
        if isinstance(exc, ValueError):
            return None, str(exc), 400
        current_app.logger.exception('No se pudo publicar avance')
        return None, 'No se pudo guardar el avance', 409
    notification_id = notification.id
    try:
        mail, _, _ = deliver(notification_id, user)
    except Exception:
        db.session.rollback()
        current_app.logger.exception('El avance se guardó; su correo sigue pendiente')
        mail = {'correo_enviado': False, 'notificacion_id': notification_id}
    return {'trabajo': trabajo_to_dict(work), **(mail or {})}, None, 201
