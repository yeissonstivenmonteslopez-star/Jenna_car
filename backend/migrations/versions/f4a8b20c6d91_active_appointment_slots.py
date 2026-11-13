"""Release unique appointment slots when a booking is cancelled.

Revision ID: f4a8b20c6d91
Revises: ef31a6c5d204

No booking is deleted or rewritten. NULL in a generated column lets MySQL
retain cancelled rows while enforcing uniqueness for non-cancelled bookings.
Interval overlap remains protected by the application's transaction protocol.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = 'f4a8b20c6d91'
down_revision = 'ef31a6c5d204'
branch_labels = None
depends_on = None

NEW_KEYS = (
    ('uq_citas_vehiculo_slot_activo', ['vehiculo_id', 'fecha', 'hora', 'cupo_activo']),
    ('uq_citas_mecanico_slot_activo', ['mecanico_id', 'fecha', 'hora', 'cupo_activo']),
)
OLD_KEYS = (
    ('uq_citas_vehiculo_fecha_hora', ['vehiculo_id', 'fecha', 'hora']),
    ('uq_citas_mecanico_fecha_hora', ['mecanico_id', 'fecha', 'hora']),
)


def _keys():
    inspector = sa.inspect(op.get_bind())
    keys = {item['name']: item.get('column_names', []) for item in inspector.get_unique_constraints('citas')}
    keys.update({item['name']: item.get('column_names', []) for item in inspector.get_indexes('citas') if item.get('unique')})
    return keys


def _duplicates(active_only):
    for column in ('vehiculo_id', 'mecanico_id'):
        where = f"{column} IS NOT NULL" + (" AND estado <> 'cancelada'" if active_only else '')
        duplicate = op.get_bind().execute(sa.text(
            f'SELECT 1 FROM citas WHERE {where} GROUP BY {column}, fecha, hora HAVING COUNT(*) > 1 LIMIT 1'
        )).first()
        if duplicate:
            raise RuntimeError('Existen citas duplicadas incompatibles con el indice destino. No se eliminaron registros.')


def upgrade():
    _duplicates(active_only=True)
    columns = {item['name']: item for item in sa.inspect(op.get_bind()).get_columns('citas')}
    if 'cupo_activo' not in columns:
        op.add_column('citas', sa.Column('cupo_activo', mysql.TINYINT(unsigned=True),
            sa.Computed("CASE WHEN estado = 'cancelada' THEN NULL ELSE 1 END", persisted=True), nullable=True))
    elif not columns['cupo_activo'].get('computed'):
        raise RuntimeError('cupo_activo existe pero no es una columna generada; revisa el esquema antes de continuar.')
    keys = _keys()
    # Create replacement keys first: foreign keys keep an index throughout.
    for name, fields in NEW_KEYS:
        if name not in keys:
            op.create_index(name, 'citas', fields, unique=True)
        elif keys[name] != fields:
            raise RuntimeError(f'El indice {name} tiene otra definicion')
    keys = _keys()
    for name, fields in OLD_KEYS:
        if name in keys:
            if keys[name] != fields:
                raise RuntimeError(f'El indice {name} tiene otra definicion')
            op.drop_index(name, table_name='citas')


def downgrade():
    # Reinstating old uniqueness can be impossible after rebooking. Abort
    # before DDL rather than removing legitimate historical appointments.
    _duplicates(active_only=False)
    keys = _keys()
    for name, fields in OLD_KEYS:
        if name not in keys:
            op.create_index(name, 'citas', fields, unique=True)
    keys = _keys()
    for name, _ in NEW_KEYS:
        if name in keys:
            op.drop_index(name, table_name='citas')
    columns = {item['name'] for item in sa.inspect(op.get_bind()).get_columns('citas')}
    if 'cupo_activo' in columns:
        op.drop_column('citas', 'cupo_activo')
