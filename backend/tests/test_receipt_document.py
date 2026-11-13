"""Receipt layout checks use fixtures and never query a database."""
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace as NS
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))
from app.documents.receipts import build_receipt_pdf
import pdfplumber


def fixture_receipt(rows=1):
    customer = NS(nombre='Cliente', apellido='Demostracion')
    order = NS(id=1, vehiculo=NS(marca='Toyota', modelo='Corolla', placa='ABC123'), cliente=customer)
    return NS(id=1, orden_trabajo=order, fecha_emision=datetime(2026, 11, 12, 10), estado='pendiente',
              detalles=[NS(descripcion=f'Servicio {index + 1}: ' + 'Revisión del vehículo y repuestos. ' * 4,
                           cantidad=2, precio_unitario=Decimal('625000.25'), subtotal=Decimal('1250000.50')) for index in range(rows)],
              subtotal=Decimal('1250000.50') * rows, descuento=Decimal('0'), total=Decimal('1250000.50') * rows)


def test_branded_receipt_and_currency():
    with pdfplumber.open(build_receipt_pdf(fixture_receipt())) as document:
        text = document.pages[0].extract_text()
        assert 'JENNACAR' in text and 'COP $1.250.000,50' in text
        assert 'PRECIO UNIT.' in text and 'TOTAL' in text
        assert len(document.pages) == 1


def test_long_receipt_retains_all_items_and_repeats_header():
    with pdfplumber.open(build_receipt_pdf(fixture_receipt(45))) as document:
        assert len(document.pages) > 1
        text = '\n'.join(page.extract_text() for page in document.pages)
        assert 'Servicio 45:' in text and 'TOTAL' in text
        assert all('JENNACAR' in page.extract_text() for page in document.pages)


def test_row_rules_do_not_cross_text():
    with pdfplumber.open(build_receipt_pdf(fixture_receipt(3))) as document:
        for page in document.pages:
            for line in page.lines:
                if abs(line['y0'] - line['y1']) < .1:
                    assert not any(char['text'].strip() and char['top'] < line['top'] < char['bottom'] for char in page.chars)
