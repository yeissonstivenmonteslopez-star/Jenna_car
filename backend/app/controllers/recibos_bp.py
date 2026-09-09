import io
from flask import Blueprint, request, jsonify, send_file
from ..extensions import db
from ..models import Recibo, OrdenTrabajo, Cliente, Vehiculo
from ..services.security import jwt_required

recibos_bp = Blueprint('recibos', __name__)


def _generar_pdf_recibo(recibo):
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    margin = 50
    y = height - margin
    order = recibo.orden_trabajo
    vehicle = order.vehiculo if order else None
    customer = order.cliente if order else None

    pdf.setFillColorRGB(0.898, 0.098, 0.165)
    pdf.setFont('Helvetica-Bold', 20)
    pdf.drawString(margin, y, 'JENNA CAR')
    pdf.setFillColorRGB(0, 0, 0)
    y -= 30
    pdf.setFont('Helvetica-Bold', 14)
    pdf.drawString(margin, y, f'RECIBO N. {recibo.id}')
    y -= 22
    pdf.setFont('Helvetica', 10)
    lines = [
        f'Fecha de emision: {recibo.fecha_emision.strftime("%d/%m/%Y %H:%M") if recibo.fecha_emision else "N/A"}',
        f'Estado: {recibo.estado.upper()}',
        f'Orden de trabajo: {order.id if order else "N/A"}',
        f'Cliente: {customer.usuario.nombre} {customer.usuario.apellido}' if customer and customer.usuario else 'Cliente: N/A',
        f'Vehiculo: {vehicle.marca} {vehicle.modelo} - Placa: {vehicle.placa}' if vehicle else 'Vehiculo: N/A',
    ]
    for line in lines:
        pdf.drawString(margin, y, line)
        y -= 16

    y -= 8
    pdf.line(margin, y, width - margin, y)
    y -= 22
    pdf.setFont('Helvetica-Bold', 10)
    pdf.drawString(margin, y, 'SERVICIO')
    pdf.drawString(width - margin - 100, y, 'SUBTOTAL')
    y -= 16
    pdf.setFont('Helvetica', 9)
    for item in (order.ordenes_servicios if order else []):
        name = (item.servicio.nombre if item.servicio else 'Servicio')[:55]
        pdf.drawString(margin, y, name)
        pdf.drawRightString(width - margin, y, f'${float(item.subtotal):.2f}')
        y -= 14

    y -= 10
    pdf.line(margin, y, width - margin, y)
    y -= 20
    pdf.drawRightString(width - margin, y, f'Subtotal: ${float(recibo.subtotal):.2f}')
    y -= 16
    pdf.drawRightString(width - margin, y, f'Descuento: ${float(recibo.descuento):.2f}')
    y -= 20
    pdf.setFont('Helvetica-Bold', 12)
    pdf.setFillColorRGB(0.898, 0.098, 0.165)
    pdf.drawRightString(width - margin, y, f'TOTAL: ${float(recibo.total):.2f}')
    pdf.setFillColorRGB(0, 0, 0)
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer


@recibos_bp.get('/mis-recibos')
@jwt_required()
def mis_recibos():
    cliente = Cliente.query.filter_by(usuario_id=request.current_user.id).first()
    if not cliente:
        return jsonify({'error': 'El usuario no tiene perfil de cliente'}), 403
    recibos = Recibo.query.filter_by(cliente_id=cliente.id).order_by(Recibo.fecha_emision.desc(), Recibo.id.desc()).all()
    return jsonify({'data': [
        {
            'id': receipt.id,
            'orden_trabajo_id': receipt.orden_id,
            'orden_id': receipt.orden_id,
            'fecha_ingreso': receipt.orden_trabajo.fecha_ingreso.isoformat() if receipt.orden_trabajo and receipt.orden_trabajo.fecha_ingreso else receipt.fecha_emision.isoformat(),
            'fecha_emision': receipt.fecha_emision.isoformat() if receipt.fecha_emision else None,
            'vehiculo_id': receipt.orden_trabajo.vehiculo_id if receipt.orden_trabajo else 0,
            'vehiculo': {
                'id': receipt.orden_trabajo.vehiculo.id,
                'marca': receipt.orden_trabajo.vehiculo.marca,
                'modelo': receipt.orden_trabajo.vehiculo.modelo,
                'placa': receipt.orden_trabajo.vehiculo.placa,
            } if receipt.orden_trabajo and receipt.orden_trabajo.vehiculo else None,
            'estado': receipt.estado,
            'subtotal': float(receipt.subtotal),
            'descuento': float(receipt.descuento),
            'total': float(receipt.total),
            'creado_en': receipt.fecha_emision.isoformat() if receipt.fecha_emision else None,
        }
        for receipt in recibos
    ]})


@recibos_bp.get('/<int:recibo_id>/pdf')
@jwt_required()
def recibo_pdf(recibo_id: int):
    usuario = request.current_user
    recibo = db.session.get(Recibo, recibo_id)
    if not recibo:
        return jsonify({'error': 'Recibo no encontrado'}), 404

    orden = db.session.get(OrdenTrabajo, recibo.orden_id)
    if not orden:
        return jsonify({'error': 'Orden relacionada no encontrada'}), 404

    # Validar propiedad del recurso
    if usuario.rol != 'admin':
        cliente = Cliente.query.filter_by(usuario_id=usuario.id).first()
        if not cliente or orden.cliente_id != cliente.id:
            return jsonify({'error': 'No tienes permisos para ver este recibo'}), 403

    download = request.args.get('download', '').lower() in {'1', 'true', 'yes'}
    return send_file(
        _generar_pdf_recibo(recibo),
        mimetype='application/pdf',
        as_attachment=download,
        download_name=f'recibo-ORDEN-{str(orden.id).zfill(3)}.pdf',
    )
