from alembic import op
import sqlalchemy as sa

revision = 'c7e084b1d923'
down_revision = 'bd713e85c190'
branch_labels = None
depends_on = None


def upgrade():
    if 'tipo_vehiculo' not in {c['name'] for c in sa.inspect(op.get_bind()).get_columns('vehiculos')}:
        op.add_column('vehiculos', sa.Column('tipo_vehiculo', sa.String(30)))


def downgrade():
    op.drop_column('vehiculos', 'tipo_vehiculo')
