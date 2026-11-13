"""Inspect existing MySQL metadata without importing the application or running DDL."""
from pathlib import Path
import os
import json
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import URL

load_dotenv(Path(__file__).resolve().parents[1] / '.env')
url = os.getenv('DATABASE_URL') or os.getenv('MYSQL_URL') or URL.create(
    'mysql+pymysql', username=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD', ''), host=os.getenv('DB_HOST', '127.0.0.1'),
    port=int(os.getenv('DB_PORT', '3306')), database=os.getenv('DB_NAME', 'jenna_car'),
)
engine = create_engine(url, connect_args={'connect_timeout': 5})
try:
    inspector = inspect(engine)
    result = {}
    for table in ('usuarios', 'vehiculos', 'servicios', 'citas', 'diagnosticos',
                  'trabajos', 'imagenes_trabajo', 'ordenes_trabajo', 'recibos', 'pagos'):
        result[table] = [{'name': c['name'], 'type': str(c['type']), 'nullable': c['nullable']}
                         for c in inspector.get_columns(table)]
    print(json.dumps(result, ensure_ascii=False, indent=2))
except Exception as exc:
    # Connection exceptions may contain credentials/URLs: never print them.
    print(f'No se pudo consultar MySQL ({type(exc).__name__}). No se ejecuto DDL.')
    raise SystemExit(1)
finally:
    engine.dispose()
