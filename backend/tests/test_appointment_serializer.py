"""The admin selector must receive the persisted mechanic assignment."""
import runpy
from pathlib import Path
from types import SimpleNamespace
import pytest

serialize = runpy.run_path(str(Path(__file__).parents[1] / 'app/schemas/serializers.py'))['cita_to_dict']

@pytest.mark.parametrize('mechanic_id', [None, 17])
def test_appointment_includes_mechanic_assignment(mechanic_id):
    appointment = SimpleNamespace(id=1, cliente_id=2, vehiculo_id=3,
        servicio_id=4, mecanico_id=mechanic_id, cliente=None, vehiculo=None,
        servicio=None, fecha='2099-01-01', hora='10:00', motivo='',
        observaciones='', estado='pendiente', created_at=None, updated_at=None)
    assert serialize(appointment)['mecanico_id'] == mechanic_id
