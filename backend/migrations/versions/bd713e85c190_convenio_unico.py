"""Identificar el convenio por NIT y permitir un único código activo."""
from alembic import op
from sqlalchemy import inspect

revision = 'bd713e85c190'
down_revision = 'ab32ed71f401'
branch_labels = None
depends_on = None


def upgrade():
    columns = {c['name'] for c in inspect(op.get_bind()).get_columns('empresas_convenio')}
    changes = []
    if 'convenio_activo' not in columns:
        changes.append('ADD convenio_activo INT GENERATED ALWAYS AS (CASE WHEN activo THEN 1 ELSE NULL END) STORED UNIQUE')
    if 'razon_social' in columns:
        changes.append('DROP COLUMN razon_social')
    if changes:
        op.execute('ALTER TABLE empresas_convenio ' + ', '.join(changes))


def downgrade():
    raise RuntimeError('No se pueden reconstruir los nombres de empresa anteriores.')
