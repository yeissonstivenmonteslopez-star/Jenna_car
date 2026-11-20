from alembic import op
import sqlalchemy as sa

revision = 'd78c913f442a'
down_revision = 'c7e084b1d923'
branch_labels = None
depends_on = None


def upgrade():
    if 'periodo_codigo' not in {c['name'] for c in sa.inspect(op.get_bind()).get_columns('empresas_convenio')}:
        op.add_column('empresas_convenio', sa.Column('periodo_codigo', sa.String(7)))
    op.execute("UPDATE empresas_convenio SET periodo_codigo = LEFT(UTC_TIMESTAMP() - INTERVAL 5 HOUR, 7) WHERE periodo_codigo IS NULL")
    op.alter_column('empresas_convenio', 'periodo_codigo', existing_type=sa.String(7), nullable=False)


def downgrade():
    op.drop_column('empresas_convenio', 'periodo_codigo')
