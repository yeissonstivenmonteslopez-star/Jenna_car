from pathlib import Path
from alembic import op
from sqlalchemy import inspect

revision = 'ab32ed71f401'
down_revision = 'f4a8b20c6d91'
branch_labels = None
depends_on = None


def upgrade():
    # One atomic MySQL 8 DDL statement per table, resumable after partial DDL.
    source = Path(__file__).resolve().parents[2] / 'database' / 'convenios_incremental.sql'
    statements = [s.strip() for s in source.read_text(encoding='utf8').split(';') if s.strip()]
    inspector = inspect(op.get_bind())
    targets = [('empresas_convenio', None), ('usuarios', 'empresa_id'), ('vehiculos', 'empresa_id'),
               ('citas', 'prioridad'), ('ordenes_trabajo', 'descuento_convenio')]
    for statement, (table, column) in zip(statements, targets, strict=True):
        if not inspector.has_table(table) or (column and column not in {c['name'] for c in inspector.get_columns(table)}):
            op.execute(statement)


def downgrade():
    raise RuntimeError('La reversión requiere preservar por separado las flotas, citas y condiciones de crédito.')
