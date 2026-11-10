"""Add Mercado Pago tracking fields; does not execute until db upgrade.

Revision ID: d82e6a3f4b10
Revises: c91d4e7a2b60
"""
from alembic import op
import sqlalchemy as sa

revision = 'd82e6a3f4b10'
down_revision = 'c91d4e7a2b60'
branch_labels = None
depends_on = None


def upgrade():
    columns = {column['name'] for column in sa.inspect(op.get_bind()).get_columns('pagos')}
    for name, size in [('mercado_pago_payment_id', 100), ('mercado_pago_status', 50), ('mercado_pago_reference', 100)]:
        if name not in columns:
            op.add_column('pagos', sa.Column(name, sa.String(size), nullable=True))
    op.alter_column('pagos', 'metodo_pago', existing_type=sa.Enum('efectivo', 'tarjeta', 'transferencia', 'nequi', 'otro'),
                    type_=sa.Enum('efectivo', 'tarjeta', 'transferencia', 'nequi', 'pse', 'mercado_pago', 'otro'), existing_nullable=False)
    op.create_index('idx_pagos_mp_reference', 'pagos', ['mercado_pago_reference'], unique=True)


def downgrade():
    # Keep provider references and enum values to avoid destroying financial history.
    op.drop_index('idx_pagos_mp_reference', table_name='pagos')
