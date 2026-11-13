"""Plan/apply migrations to an existing DB, with backup and row-count checks."""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app import app, db
from sqlalchemy import inspect, text
from flask_migrate import stamp, upgrade

MIGRATIONS = str(ROOT / 'backend' / 'migrations')
BASELINE = 'c91d4e7a2b60'
SAFE_REVISIONS = {BASELINE, 'd82e6a3f4b10', 'ef31a6c5d204', 'f4a8b20c6d91'}
OPTIONAL = {
    'citas': {'cupo_activo'},
    'pagos': {'mercado_pago_payment_id', 'mercado_pago_status', 'mercado_pago_reference'},
    'ordenes_trabajo': {'estado_aprobacion'}, 'recibos': {'enviado_cliente'},
}


def imported_baseline(inspector):
    """Recognize the SQL-imported baseline, never replay destructive legacy DDL."""
    tables = set(inspector.get_table_names())
    if {'clientes', 'orden_servicios'} & tables:
        raise RuntimeError('Esquema legado: requiere una revision manual antes de migrar.')
    for table in db.metadata.sorted_tables:
        if table.name not in tables:
            raise RuntimeError(f'Falta la tabla {table.name}; no se inicializara una base nueva.')
        actual = {column['name'] for column in inspector.get_columns(table.name)}
        required = {column.name for column in table.columns} - OPTIONAL.get(table.name, set())
        if required - actual:
            raise RuntimeError(f'Columnas faltantes en {table.name}: {sorted(required - actual)}')
        if actual & OPTIONAL.get(table.name, set()):
            raise RuntimeError('Base sin version con cambios posteriores: revisar antes de registrar la linea base.')
    for name, expected in (('uq_citas_vehiculo_fecha_hora', ['vehiculo_id', 'fecha', 'hora']),
                           ('uq_citas_mecanico_fecha_hora', ['mecanico_id', 'fecha', 'hora'])):
        keys = {item['name']: item['column_names'] for item in inspector.get_indexes('citas') if item['unique']}
        if keys.get(name) != expected:
            raise RuntimeError(f'El indice {name} no corresponde a la linea base importada.')


def counts(connection):
    return {name: connection.execute(text(f'SELECT COUNT(*) FROM `{name}`')).scalar_one()
            for name in inspect(connection).get_table_names() if name != 'alembic_version'}


def dump_database(url, executable):
    backup_dir = ROOT / '.local-backups'
    backup_dir.mkdir(exist_ok=True)
    destination = backup_dir / f'jenna-car-{datetime.now(timezone.utc):%Y%m%dT%H%M%S%fZ}.sql'
    def quote(value):
        return '"' + str(value or '').replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r') + '"'
    config = '[client]\n' + '\n'.join(f'{key}={quote(value)}' for key, value in {
        'host': url.host or '127.0.0.1', 'port': url.port or 3306,
        'user': url.username, 'password': url.password,
    }.items()) + '\n'
    config_path = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.cnf', dir=backup_dir, delete=False, encoding='utf-8') as temporary:
            temporary.write(config)
            config_path = Path(temporary.name)
        with destination.open('xb') as output:
            result = subprocess.run([executable, f'--defaults-extra-file={config_path}',
                '--single-transaction', '--hex-blob', '--no-tablespaces',
                '--set-gtid-purged=OFF', url.database], stdout=output, stderr=subprocess.PIPE)
        if result.returncode or destination.stat().st_size == 0:
            destination.unlink(missing_ok=True)
            raise RuntimeError('No se pudo completar el respaldo. No se ejecutaran migraciones.')
        return destination
    finally:
        if config_path:
            config_path.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Respaldar y aplicar. Sin esta opcion solo inspecciona.')
    parser.add_argument('--mysqldump', default=shutil.which('mysqldump'), help='Ruta a mysqldump compatible con el servidor')
    args = parser.parse_args()
    with app.app_context():
        with db.engine.connect() as connection:
            inspector = inspect(connection)
            tables = inspector.get_table_names()
            revisions = connection.execute(text('SELECT version_num FROM alembic_version')).scalars().all() if 'alembic_version' in tables else []
            if len(revisions) > 1 or (revisions and revisions[0] not in SAFE_REVISIONS):
                raise RuntimeError('Revision no soportada por este asistente: se requiere revisar el esquema legado.')
            if not revisions:
                imported_baseline(inspector)
            before = counts(connection)
        print('Revision actual:', revisions[0] if revisions else 'SQL importado, sin version Alembic')
        print('Destino: f4a8b20c6d91; datos existentes conservados.')
        print('Plan: registrar linea base si corresponde; campos existentes de pagos/aprobacion/recibos; cupos activos de citas.')
        if not args.apply:
            print('Solo lectura. Para ejecutar con respaldo usa --apply --mysqldump RUTA.')
            return
        if not args.mysqldump:
            raise RuntimeError('Indica --mysqldump; no se migrara sin un respaldo previo.')
        backup = dump_database(db.engine.url, args.mysqldump)
        print('Respaldo:', backup)
        if not revisions:
            # This only records an inspected, externally imported baseline.
            stamp(directory=MIGRATIONS, revision=BASELINE)
        upgrade(directory=MIGRATIONS, revision='f4a8b20c6d91')
        with db.engine.connect() as connection:
            after = counts(connection)
            revision = connection.execute(text('SELECT version_num FROM alembic_version')).scalar_one()
        if before != after:
            raise RuntimeError('Las cantidades de filas cambiaron. Conserva el respaldo y revisa antes de continuar.')
        print(f'Migraciones aplicadas: {revision}. Cantidades de filas verificadas sin cambios.')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        # Never print driver exception strings, which may contain URLs/secrets.
        print(str(exc) if isinstance(exc, RuntimeError) else f'No se pudo completar la migracion ({type(exc).__name__}).', file=sys.stderr)
        raise SystemExit(1)
