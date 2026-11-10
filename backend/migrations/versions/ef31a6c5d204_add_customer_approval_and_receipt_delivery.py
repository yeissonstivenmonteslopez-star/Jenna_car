"""Add customer repair approval and explicit receipt delivery.

Revision ID: ef31a6c5d204
Revises: d82e6a3f4b10
"""
from alembic import op
import sqlalchemy as sa


revision = 'ef31a6c5d204'
down_revision = 'd82e6a3f4b10'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'ordenes_trabajo',
        sa.Column(
            'estado_aprobacion',
            sa.Enum('pendiente', 'aprobado', 'rechazado', name='orden_aprobacion_estado'),
            nullable=False,
            server_default='pendiente',
        ),
    )
    op.add_column(
        'recibos',
        sa.Column('enviado_cliente', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute("UPDATE ordenes_trabajo SET estado_aprobacion = 'aprobado'")
    op.execute('UPDATE recibos SET enviado_cliente = 1')
    op.alter_column(
        'ordenes_trabajo',
        'estado_aprobacion',
        existing_type=sa.Enum('pendiente', 'aprobado', 'rechazado', name='orden_aprobacion_estado'),
        server_default=None,
    )
    op.alter_column('recibos', 'enviado_cliente', existing_type=sa.Boolean(), server_default=None)


def downgrade():
    op.drop_column('recibos', 'enviado_cliente')
    op.drop_column('ordenes_trabajo', 'estado_aprobacion')
