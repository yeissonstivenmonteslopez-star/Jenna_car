import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace as NS
from unittest.mock import MagicMock
from decimal import Decimal
import pytest

@pytest.fixture
def revision(monkeypatch):
    for name in ('quote_test', 'quote_test.services', 'quote_test.utils'):
        package = ModuleType(name); package.__path__ = []
        monkeypatch.setitem(sys.modules, name, package)
    session = MagicMock()
    order = NS(id=1, estado_aprobacion='rechazado', estado='pendiente', subtotal=Decimal('100'), total=Decimal('100'),
        trabajos=[NS(mecanico_id=7)], recibo=NS(estado='pendiente', enviado_cliente=False, total=Decimal('100'), descuento=Decimal('0')), vehiculo=NS(usuario_id=8))
    query = MagicMock(); query.filter_by.return_value.with_for_update.return_value.populate_existing.return_value.first.return_value = order
    for name, attrs in {'extensions': {'db': NS(session=session)}, 'models': {'OrdenTrabajo': NS(query=query)}, 'utils.notifications': {'notificacion_por_usuario': MagicMock()}}.items():
        module = ModuleType('quote_test.' + name); module.__dict__.update(attrs)
        monkeypatch.setitem(sys.modules, module.__name__, module)
    spec = importlib.util.spec_from_file_location('quote_test.services.quote_revision', Path(__file__).parents[1] / 'app/services/quote_revision.py')
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module, order, session

def test_revision_preserves_subtotal_and_reopens_approval(revision):
    module, order, session = revision
    data, error, status = module.revise(NS(id=7), 1, {'total': '80'})
    assert status == 200 and error is None and data['estado_aprobacion'] == 'pendiente'
    assert order.subtotal == 100 and order.recibo.descuento == 20 and order.total == 80
    session.commit.assert_called_once()

@pytest.mark.parametrize('amount', ['NaN', '-1', '101', '0', '80.555'])
def test_invalid_total_does_not_commit(revision, amount):
    module, order, session = revision
    assert module.revise(NS(id=7), 1, {'total': amount})[2] == 400
    session.commit.assert_not_called()

def test_another_mechanic_cannot_revise(revision):
    module, order, session = revision
    assert module.revise(NS(id=99), 1, {'total': '80'})[2] == 404
    session.commit.assert_not_called()

def test_paid_receipt_cannot_be_revised(revision):
    module, order, session = revision
    order.recibo.estado = 'pagado'
    assert module.revise(NS(id=7), 1, {'total': '80'})[2] == 409
    session.commit.assert_not_called()
