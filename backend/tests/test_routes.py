import os
os.environ['SKIP_DB_INIT'] = '1'

import sys
sys.path.insert(0, '.')
from backend.app import create_app
app = create_app()

print('=== RUTAS DE PAGOS ===')
for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
    methods = ', '.join(sorted(rule.methods)) if rule.methods else 'GET'
    rule_str = str(rule)
    if any(kw in rule_str.lower() for kw in ['pago', 'payment', 'mercado']):
        print(f'  {rule.rule:50s} {methods}')
