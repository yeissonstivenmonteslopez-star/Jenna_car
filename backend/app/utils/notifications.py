def notificacion_por_usuario(usuario_id, titulo, mensaje, tipo='sistema', link=None, do_commit=True):
    from ..models import Notificacion
    from ..extensions import db

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
    return notificacion
