import os
os.environ['SKIP_DB_INIT'] = '1'

import sys
sys.path.insert(0, '.')
from backend.app import create_app
app = create_app()
print('App created successfully')

# List payment-related routes
print("\n=== RUTAS DE PAGOS ===")
for rule in app.url_map.iter_rules():
    rule_str = str(rule)
    if 'payments' in rule_str.lower() or 'pago' in rule_str.lower():
        methods = ', '.join(sorted(rule.methods)) if rule.methods else 'GET'
        print(f"  {rule.rule:50s} {methods}")
