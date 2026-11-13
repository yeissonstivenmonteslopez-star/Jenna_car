"""Display formatting without importing Flask or connecting to MySQL."""
import importlib.util
from pathlib import Path
from decimal import Decimal
import pytest

source = Path(__file__).parents[1] / 'app/utils/money.py'
spec = importlib.util.spec_from_file_location('money_display', source)
money = importlib.util.module_from_spec(spec)
spec.loader.exec_module(money)


@pytest.mark.parametrize('value,expected', [
    (0, 'COP $0'), (1000, 'COP $1.000'), (1250000, 'COP $1.250.000'),
    (Decimal('1250000.50'), 'COP $1.250.000,50'), (Decimal('15000.75'), 'COP $15.000,75'),
    (Decimal('-1000.25'), 'COP $-1.000,25'), (None, 'COP $0'), ('invalid', 'COP $0'),
])
def test_currency_display(value, expected):
    assert money.format_cop(value) == expected
