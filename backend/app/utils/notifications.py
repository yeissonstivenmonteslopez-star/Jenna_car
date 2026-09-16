def notificacion_por_usuario(usuario_id, titulo, mensaje, tipo='sistema', link=None, do_commit=True):
    from ..models import Notificacion, Usuario
    from ..extensions import db
    from .email import enviar_correo

    notificacion = Notificacion.crear(
        usuario_id=usuario_id,
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo,
        link=link,
        do_commit=do_commit,
    )
    if do_commit:
        db.session.commit()
    
    usuario = Usuario.query.get(usuario_id)
    if usuario and usuario.email:
        html_mensaje = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #ddd;">
                <h2 style="color: #333; margin: 0;">Jenna Car - Notificación</h2>
            </div>
            <div style="padding: 20px; color: #555;">
                <h3 style="color: #0056b3;">{titulo}</h3>
                <p style="font-size: 16px; line-height: 1.5;">{mensaje}</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #ddd;">
                <p>Este es un correo generado automáticamente, por favor no respondas a este mensaje.</p>
            </div>
        </div>
        """
        enviar_correo(usuario.email, f"Jenna Car: {titulo}", html_mensaje)

    return notificacion
