import os
os.environ['SKIP_DB_INIT'] = '1'

import sys
sys.path.insert(0, '.')
from backend.app import create_app
app = create_app()
print('App created successfully')

# List ALL routes
print("\n=== TODAS LAS RUTAS ===")
for rule in sorted(app.url_map.iter_rules(), key=lambda r: str(r)):
    methods = ', '.join(sorted(rule.methods)) if rule.methods else 'GET'
    print(f"  {rule.endpoint:30s} {methods:10s} {rule.rule}")

# Check specifically for mechanic routes
print("\n=== RUTAS DE MECÁNICO ===")
mechanic_routes = [r for r in app.url_map.iter_rules() if 'mechanic' in r.rule.lower() or 'mecanico' in r.rule.lower()]
for r in mechanic_routes:
    methods = ', '.join(sorted(r.methods)) if r.methods else 'GET'
    print(f"  {r.endpoint:30s} {methods:10s} {r.rule}")

# Check admin routes
print("\n=== RUTAS ADMIN ===")
admin_routes = [r for r in app.url_map.iter_rules() if 'admin' in r.rule.lower() and 'static' not in r.rule.lower()]
for r in admin_routes[:20]:
    methods = ', '.join(sorted(r.methods)) if r.methods else 'GET'
    print(f"  {r.endpoint:30s} {methods:10s} {r.rule}")
