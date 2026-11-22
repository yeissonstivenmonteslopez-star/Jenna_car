import ast
from pathlib import Path
from types import SimpleNamespace as NS
from unittest.mock import MagicMock
from decimal import Decimal
import pytest

@pytest.mark.parametrize('quoted, expected', [(True, Decimal('180000')), (False, Decimal('360000'))])
def test_work_charges_existing_catalog_item_once(quoted, expected):
    tree = ast.parse((Path(__file__).parents[1] / 'app/services/mechanic_s.py').read_text(encoding='utf-8'))
    function = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'register_trabajo')
    function.body = [n for n in function.body if not isinstance(n, (ast.Import, ast.ImportFrom))]
    detail = NS(descripcion='Diagnóstico' if quoted else 'Otro servicio', cantidad=1,
                precio_unitario=Decimal('180000'), subtotal=Decimal('180000'))
    receipt = NS(estado='pendiente', detalles=[detail])
    order = NS(id=1, vehiculo_id=2, estado='pendiente', estado_aprobacion='pendiente',
               recibo=receipt, subtotal=Decimal('180000'), total=Decimal('180000'), descuento_convenio=None)
    service = NS(nombre='Diagnóstico', estado='activo')
    diagnosis = MagicMock()
    diagnosis.query.filter_by.return_value.first.return_value = NS(mecanico_id=7, cita=NS(vehiculo_id=2, vehiculo=NS(usuario_id=8)))
    db = MagicMock()
    order_model, service_model = object(), object()
    db.session.get.side_effect = lambda model, key, **kwargs: order if model is order_model else service
    namespace = dict(Decimal=Decimal, InvalidOperation=ArithmeticError, Diagnostico=diagnosis,
        OrdenTrabajo=order_model, Servicio=service_model, db=db,
        asegurar_recibo_orden=lambda value: receipt, Trabajo=lambda **kw: NS(id=3, **kw),
        ReciboDetalle=lambda **kw: NS(**kw), notificacion_por_usuario=MagicMock(),
        format_cop=str, trabajo_to_dict=lambda value: {})
    exec(compile(ast.fix_missing_locations(ast.Module(body=[function], type_ignores=[])), '<test>', 'exec'), namespace)
    result = namespace['register_trabajo'](NS(id=7), dict(diagnostico_id=1, servicio_id=1, orden_id=1,
        cantidad=1, precio='180000', descripcion='Revisión del vehículo'))
    assert result[1] is None
    assert order.total == expected == receipt.total
    assert len(receipt.detalles) == (1 if quoted else 2)
