"""Branded, paginated service receipts with Colombian currency formatting."""
from io import BytesIO

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen.canvas import Canvas

from ..utils.money import format_cop

MARGIN = 44
WIDTH, HEIGHT = letter
INK = HexColor('#171717')
RED = HexColor('#C62828')
MUTED = HexColor('#666666')
RULE = HexColor('#E5E5E5')


def _header(document, receipt):
    document.setFillColor(INK)
    document.roundRect(MARGIN, HEIGHT - 112, WIDTH - 2 * MARGIN, 68, 4, fill=1, stroke=0)
    document.setFillColor(RED)
    document.rect(MARGIN, HEIGHT - 112, 5, 68, fill=1, stroke=0)
    document.setFillColor(HexColor('#FFFFFF'))
    document.setFont('Helvetica-Bold', 25)
    document.drawString(MARGIN + 20, HEIGHT - 78, 'JENNACAR')
    document.setFont('Helvetica', 8)
    document.drawString(MARGIN + 21, HEIGHT - 96, 'SERVICIO AUTOMOTRIZ')
    document.setFont('Helvetica-Bold', 12)
    document.drawRightString(WIDTH - MARGIN - 18, HEIGHT - 76, f'RECIBO #{receipt.id}')
    document.setFont('Helvetica', 8)
    document.drawRightString(WIDTH - MARGIN - 18, HEIGHT - 95, 'COMPROBANTE DE SERVICIO')


def _footer(document, receipt):
    document.setStrokeColor(RULE)
    document.line(MARGIN, 42, WIDTH - MARGIN, 42)
    document.setFillColor(MUTED)
    document.setFont('Helvetica', 8)
    document.drawString(MARGIN, 28, f'JENNACAR | Recibo #{receipt.id}')
    document.drawRightString(WIDTH - MARGIN, 28, f'Pagina {document.getPageNumber()}')


def _customer_lines(receipt):
    order = receipt.orden_trabajo
    vehicle = order.vehiculo if order else None
    customer = order.cliente if order else None
    user = getattr(customer, 'usuario', customer) if customer else None
    return [
        ('Emision', receipt.fecha_emision.strftime('%d/%m/%Y %H:%M') if receipt.fecha_emision else 'N/A'),
        ('Estado', str(receipt.estado).replace('_', ' ').capitalize()),
        ('Orden', str(order.id) if order else 'N/A'),
        ('Cliente', f'{user.nombre} {user.apellido}' if user else 'N/A'),
        ('Vehiculo', f'{vehicle.marca} {vehicle.modelo} | Placa {vehicle.placa}' if vehicle else 'N/A'),
    ]


def _customer(document, receipt):
    y = HEIGHT - 140
    for label, value in _customer_lines(receipt):
        document.setFont('Helvetica', 9)
        document.setFillColor(MUTED)
        document.drawString(MARGIN, y, label)
        document.setFillColor(INK)
        lines = simpleSplit(str(value), 'Helvetica', 9, WIDTH - 2 * MARGIN - 82)
        for line in lines:
            document.drawString(MARGIN + 82, y, line)
            y -= 13
        y -= 5
    return y - 12


def _table_header(document, y):
    document.setFillColor(HexColor('#F5F5F5'))
    document.rect(MARGIN, y - 24, WIDTH - 2 * MARGIN, 28, fill=1, stroke=0)
    document.setFillColor(MUTED)
    document.setFont('Helvetica-Bold', 8)
    document.drawString(MARGIN + 8, y - 13, 'CONCEPTO')
    document.drawCentredString(MARGIN + 254, y - 13, 'CANT.')
    document.drawRightString(MARGIN + 402, y - 13, 'PRECIO UNIT.')
    document.drawRightString(WIDTH - MARGIN - 8, y - 13, 'SUBTOTAL')
    return y - 43


def build_receipt_pdf(receipt):
    buffer = BytesIO()
    document = Canvas(buffer, pagesize=letter)
    document.setTitle(f'JENNACAR - Recibo {receipt.id}')
    document.setAuthor('JENNACAR')
    _header(document, receipt)
    y = _table_header(document, _customer(document, receipt))
    for item in receipt.detalles:
        lines = simpleSplit(str(item.descripcion or ''), 'Helvetica', 9, 215) or ['']
        first = True
        while lines:
            if y < 80:
                _footer(document, receipt)
                document.showPage()
                _header(document, receipt)
                y = _table_header(document, HEIGHT - 140)
            count = max(1, int((y - 65) // 13))
            chunk, lines = lines[:count], lines[count:]
            document.setFillColor(INK)
            document.setFont('Helvetica', 9)
            for index, line in enumerate(chunk):
                document.drawString(MARGIN + 8, y - index * 13, line)
            if first:
                document.setFont('Helvetica', 8)
                document.drawCentredString(MARGIN + 254, y, str(getattr(item, 'cantidad', 1)))
                document.drawRightString(MARGIN + 402, y, format_cop(getattr(item, 'precio_unitario', item.subtotal)))
                document.drawRightString(WIDTH - MARGIN - 8, y, format_cop(item.subtotal))
                first = False
            y -= len(chunk) * 13 + 16
        document.setStrokeColor(RULE)
        document.line(MARGIN, y + 16, WIDTH - MARGIN, y + 16)
    if y < 150:
        _footer(document, receipt)
        document.showPage()
        _header(document, receipt)
        y = HEIGHT - 145
    y -= 18
    for label, amount in [('Subtotal', receipt.subtotal), ('Descuento', receipt.descuento)]:
        document.setFont('Helvetica', 10)
        document.setFillColor(MUTED)
        document.drawString(MARGIN + 285, y, label)
        document.drawRightString(WIDTH - MARGIN - 8, y, format_cop(amount))
        y -= 22
    document.setFillColor(RED)
    document.setFont('Helvetica-Bold', 12)
    document.drawString(MARGIN + 285, y - 5, 'TOTAL')
    document.drawRightString(WIDTH - MARGIN - 8, y - 5, format_cop(receipt.total))
    _footer(document, receipt)
    document.save()
    buffer.seek(0)
    return buffer
