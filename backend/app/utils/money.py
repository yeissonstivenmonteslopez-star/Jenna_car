"""Colombian currency display only; no changes to stored amounts."""
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


def format_cop(amount):
    try:
        value = Decimal(str(amount or 0))
        if not value.is_finite():
            value = Decimal(0)
        value = value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        value = Decimal(0)
    decimals = 0 if value == value.to_integral_value() else 2
    text = f'{value:,.{decimals}f}'.replace(',', '_').replace('.', ',').replace('_', '.')
    return f'COP ${text}'
