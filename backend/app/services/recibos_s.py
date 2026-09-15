"""Receipt queries, ownership checks, and PDF generation."""
import io
from ..extensions import db
from ..models import Cliente, OrdenTrabajo, Recibo

def list_for_user(user_id):
    cliente = Cliente.query.filter_by(usuario_id=user_id).first()
    if not cliente: return None
    receipts = Recibo.query.filter_by(cliente_id=cliente.id).order_by(Recibo.fecha_emision.desc(), Recibo.id.desc()).all()
    return [{'id': r.id, 'orden_trabajo_id': r.orden_id, 'orden_id': r.orden_id, 'fecha_ingreso': r.orden_trabajo.fecha_ingreso.isoformat() if r.orden_trabajo and r.orden_trabajo.fecha_ingreso else r.fecha_emision.isoformat(), 'fecha_emision': r.fecha_emision.isoformat() if r.fecha_emision else None, 'vehiculo_id': r.orden_trabajo.vehiculo_id if r.orden_trabajo else 0, 'vehiculo': {'id': r.orden_trabajo.vehiculo.id, 'marca': r.orden_trabajo.vehiculo.marca, 'modelo': r.orden_trabajo.vehiculo.modelo, 'placa': r.orden_trabajo.vehiculo.placa} if r.orden_trabajo and r.orden_trabajo.vehiculo else None, 'estado': r.estado, 'subtotal': float(r.subtotal), 'descuento': float(r.descuento), 'total': float(r.total), 'creado_en': r.fecha_emision.isoformat() if r.fecha_emision else None} for r in receipts]

def find_owned(user, receipt_id):
    receipt = db.session.get(Recibo, receipt_id)
    if not receipt: return None, 'Recibo no encontrado', 404
    order = db.session.get(OrdenTrabajo, receipt.orden_id)
    if not order: return None, 'Orden relacionada no encontrada', 404
    if user.rol != 'admin':
        client = Cliente.query.filter_by(usuario_id=user.id).first()
        if not client or order.cliente_id != client.id: return None, 'No tienes permisos para ver este recibo', 403
    return receipt, None, None

def pdf(receipt):
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    buffer = io.BytesIO(); pdf = canvas.Canvas(buffer, pagesize=letter); width, height = letter; margin = 50; y = height - margin; order = receipt.orden_trabajo; vehicle = order.vehiculo if order else None; customer = order.cliente if order else None
    pdf.setFillColorRGB(0.898, 0.098, 0.165); pdf.setFont('Helvetica-Bold', 20); pdf.drawString(margin, y, 'JENNA CAR'); pdf.setFillColorRGB(0, 0, 0); y -= 30; pdf.setFont('Helvetica-Bold', 14); pdf.drawString(margin, y, f'RECIBO N. {receipt.id}'); y -= 22; pdf.setFont('Helvetica', 10)
    for line in [f'Fecha de emision: {receipt.fecha_emision.strftime("%d/%m/%Y %H:%M") if receipt.fecha_emision else "N/A"}', f'Estado: {receipt.estado.upper()}', f'Orden de trabajo: {order.id if order else "N/A"}', f'Cliente: {customer.usuario.nombre} {customer.usuario.apellido}' if customer and customer.usuario else 'Cliente: N/A', f'Vehiculo: {vehicle.marca} {vehicle.modelo} - Placa: {vehicle.placa}' if vehicle else 'Vehiculo: N/A']:
        pdf.drawString(margin, y, line); y -= 16
    y -= 8; pdf.line(margin, y, width - margin, y); y -= 22; pdf.setFont('Helvetica-Bold', 10); pdf.drawString(margin, y, 'SERVICIO'); pdf.drawString(width - margin - 100, y, 'SUBTOTAL'); y -= 16; pdf.setFont('Helvetica', 9)
    for item in (order.ordenes_servicios if order else []):
        pdf.drawString(margin, y, (item.servicio.nombre if item.servicio else 'Servicio')[:55]); pdf.drawRightString(width - margin, y, f'${float(item.subtotal):.2f}'); y -= 14
    y -= 10; pdf.line(margin, y, width - margin, y); y -= 20; pdf.drawRightString(width - margin, y, f'Subtotal: ${float(receipt.subtotal):.2f}'); y -= 16; pdf.drawRightString(width - margin, y, f'Descuento: ${float(receipt.descuento):.2f}'); y -= 20; pdf.setFont('Helvetica-Bold', 12); pdf.setFillColorRGB(0.898, 0.098, 0.165); pdf.drawRightString(width - margin, y, f'TOTAL: ${float(receipt.total):.2f}'); pdf.showPage(); pdf.save(); buffer.seek(0); return buffer
