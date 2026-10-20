"""Align legacy tables with the Jenna Car database definition.

Revision ID: c91d4e7a2b60
Revises: b7f3c9e1a2d4
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


revision = 'c91d4e7a2b60'
down_revision = 'b7f3c9e1a2d4'
branch_labels = None
depends_on = None


def _drop_foreign_keys_for_column(table, column):
    inspector = sa.inspect(op.get_bind())
    for foreign_key in inspector.get_foreign_keys(table):
        if column in (foreign_key.get('constrained_columns') or []):
            op.drop_constraint(foreign_key['name'], table, type_='foreignkey')


def upgrade():
    op.add_column('usuarios', sa.Column('documento', sa.String(30), nullable=True))
    op.add_column('usuarios', sa.Column('direccion', sa.String(255), nullable=True))
    op.add_column('usuarios', sa.Column('ciudad', sa.String(100), nullable=True))
    op.add_column('usuarios', sa.Column('fecha_registro', sa.DateTime(), nullable=True))
    op.execute(sa.text(
        'UPDATE usuarios u JOIN clientes c ON c.usuario_id = u.id '
        'SET u.documento = c.documento, u.direccion = c.direccion, '
        'u.ciudad = c.ciudad, u.fecha_registro = c.fecha_registro'
    ))
    op.create_unique_constraint('uq_usuarios_documento', 'usuarios', ['documento'])
    op.execute("UPDATE usuarios SET rol = 'usuario' WHERE rol NOT IN ('admin', 'usuario', 'mecanico')")
    op.execute("UPDATE usuarios SET estado = 'activo' WHERE estado NOT IN ('activo', 'inactivo')")
    op.alter_column('usuarios', 'rol', existing_type=sa.String(20), type_=sa.Enum('admin', 'usuario', 'mecanico', name='usuario_rol'), existing_nullable=False)
    op.alter_column('usuarios', 'estado', existing_type=sa.String(20), type_=sa.Enum('activo', 'inactivo', name='usuario_estado'), existing_nullable=False)

    op.execute("UPDATE servicios SET estado = 'activo' WHERE estado NOT IN ('activo', 'inactivo')")
    op.alter_column('servicios', 'estado', existing_type=sa.String(20), type_=sa.Enum('activo', 'inactivo', name='servicio_estado'), existing_nullable=False)

    op.add_column('vehiculos', sa.Column('usuario_id', mysql.INTEGER(unsigned=True), nullable=True))
    op.execute(sa.text(
        'UPDATE vehiculos v JOIN clientes c ON c.id = v.cliente_id '
        'SET v.usuario_id = c.usuario_id'
    ))
    _drop_foreign_keys_for_column('vehiculos', 'cliente_id')
    op.drop_column('vehiculos', 'cliente_id')
    op.alter_column('vehiculos', 'usuario_id', existing_type=mysql.INTEGER(unsigned=True), nullable=False)
    op.create_foreign_key('fk_vehiculos_usuario', 'vehiculos', 'usuarios', ['usuario_id'], ['id'], ondelete='RESTRICT', onupdate='CASCADE')
    op.alter_column('vehiculos', 'placa', existing_type=sa.String(10), type_=sa.String(20), existing_nullable=False)
    op.alter_column('vehiculos', 'marca', existing_type=sa.String(50), type_=sa.String(100), existing_nullable=False)
    op.alter_column('vehiculos', 'modelo', existing_type=sa.String(50), type_=sa.String(100), existing_nullable=False)
    op.alter_column('vehiculos', 'color', existing_type=sa.String(30), type_=sa.String(50), existing_nullable=True)
    op.execute("UPDATE vehiculos SET tipo_combustible = 'gasolina' WHERE tipo_combustible NOT IN ('gasolina', 'diesel', 'hibrido', 'electrico', 'gas')")
    op.execute("UPDATE vehiculos SET estado = 'activo' WHERE estado NOT IN ('activo', 'en_mantenimiento', 'inactivo')")
    op.alter_column('vehiculos', 'tipo_combustible', existing_type=sa.String(20), type_=sa.Enum('gasolina', 'diesel', 'hibrido', 'electrico', 'gas', name='vehiculo_combustible'), existing_nullable=False)
    op.alter_column('vehiculos', 'estado', existing_type=sa.String(20), type_=sa.Enum('activo', 'en_mantenimiento', 'inactivo', name='vehiculo_estado'), existing_nullable=False)

    op.add_column('citas', sa.Column('mecanico_id', mysql.INTEGER(unsigned=True), nullable=True))
    _drop_foreign_keys_for_column('citas', 'cliente_id')
    op.drop_column('citas', 'cliente_id')
    op.create_foreign_key('fk_citas_mecanico', 'citas', 'usuarios', ['mecanico_id'], ['id'], ondelete='SET NULL', onupdate='CASCADE')
    op.create_unique_constraint('uq_citas_vehiculo_fecha_hora', 'citas', ['vehiculo_id', 'fecha', 'hora'])
    op.create_unique_constraint('uq_citas_mecanico_fecha_hora', 'citas', ['mecanico_id', 'fecha', 'hora'])
    op.create_index('idx_citas_fecha_hora', 'citas', ['fecha', 'hora'])

    op.execute(sa.text(
        "UPDATE ordenes_trabajo SET observaciones = TRIM(CONCAT_WS('\\n', "
        "NULLIF(observaciones, ''), "
        "IF(NULLIF(diagnostico, '') IS NULL, NULL, CONCAT('Diagnostico: ', diagnostico)), "
        "IF(NULLIF(trabajo_realizado, '') IS NULL, NULL, CONCAT('Trabajo realizado: ', trabajo_realizado))) ) "
        "WHERE NULLIF(diagnostico, '') IS NOT NULL OR NULLIF(trabajo_realizado, '') IS NOT NULL"
    ))
    op.execute(sa.text(
        "INSERT INTO recibos (orden_id, cliente_id, fecha_emision, subtotal, total, descuento, estado) "
        "SELECT o.id, o.cliente_id, CURRENT_TIMESTAMP, o.subtotal, o.total, "
        "GREATEST(o.subtotal - o.total, 0), 'pendiente' "
        "FROM ordenes_trabajo o LEFT JOIN recibos r ON r.orden_id = o.id "
        "WHERE r.id IS NULL"
    ))
    _drop_foreign_keys_for_column('ordenes_trabajo', 'cliente_id')
    op.drop_column('ordenes_trabajo', 'cliente_id')
    op.drop_column('ordenes_trabajo', 'diagnostico')
    op.drop_column('ordenes_trabajo', 'trabajo_realizado')
    op.execute('UPDATE ordenes_trabajo SET kilometraje = 0 WHERE kilometraje IS NULL')
    op.alter_column('ordenes_trabajo', 'kilometraje', existing_type=mysql.INTEGER(unsigned=True), nullable=False)

    op.create_table(
        'diagnosticos',
        sa.Column('id', mysql.INTEGER(unsigned=True), autoincrement=True, nullable=False),
        sa.Column('cita_id', mysql.INTEGER(unsigned=True), nullable=False),
        sa.Column('mecanico_id', mysql.INTEGER(unsigned=True), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=False),
        sa.Column('observaciones', sa.Text(), nullable=True),
        sa.Column('solucion_recomendada', sa.Text(), nullable=True),
        sa.Column('estado', sa.Enum('pendiente', 'en_proceso', 'completado', name='diagnostico_estado'), nullable=False, server_default='pendiente'),
        sa.Column('fecha_diagnostico', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_at', mysql.TIMESTAMP(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', mysql.TIMESTAMP(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['cita_id'], ['citas.id'], name='fk_diagnosticos_cita', ondelete='RESTRICT', onupdate='CASCADE'),
        sa.ForeignKeyConstraint(['mecanico_id'], ['usuarios.id'], name='fk_diagnosticos_mecanico', ondelete='RESTRICT', onupdate='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        mysql_engine='InnoDB',
    )
    op.create_index('idx_diagnosticos_cita', 'diagnosticos', ['cita_id'])
    op.create_index('idx_diagnosticos_mecanico', 'diagnosticos', ['mecanico_id'])

    op.create_table(
        'trabajos',
        sa.Column('id', mysql.INTEGER(unsigned=True), autoincrement=True, nullable=False),
        sa.Column('diagnostico_id', mysql.INTEGER(unsigned=True), nullable=False),
        sa.Column('servicio_id', mysql.INTEGER(unsigned=True), nullable=False),
        sa.Column('mecanico_id', mysql.INTEGER(unsigned=True), nullable=False),
        sa.Column('orden_id', mysql.INTEGER(unsigned=True), nullable=True),
        sa.Column('descripcion', sa.Text(), nullable=False),
        sa.Column('estado', sa.Enum('pendiente', 'en_proceso', 'completado', 'cancelado', name='trabajo_estado'), nullable=False, server_default='pendiente'),
        sa.Column('fecha_inicio', sa.DateTime(), nullable=True),
        sa.Column('fecha_fin', sa.DateTime(), nullable=True),
        sa.Column('cantidad', mysql.INTEGER(unsigned=True), nullable=False, server_default='1'),
        sa.Column('precio', sa.Numeric(10, 2), nullable=False, server_default='0.00'),
        sa.Column('subtotal', sa.Numeric(10, 2), nullable=False, server_default='0.00'),
        sa.Column('created_at', mysql.TIMESTAMP(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', mysql.TIMESTAMP(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['diagnostico_id'], ['diagnosticos.id'], name='fk_trabajos_diagnostico', ondelete='RESTRICT', onupdate='CASCADE'),
        sa.ForeignKeyConstraint(['servicio_id'], ['servicios.id'], name='fk_trabajos_servicio', ondelete='RESTRICT', onupdate='CASCADE'),
        sa.ForeignKeyConstraint(['mecanico_id'], ['usuarios.id'], name='fk_trabajos_mecanico', ondelete='RESTRICT', onupdate='CASCADE'),
        sa.ForeignKeyConstraint(['orden_id'], ['ordenes_trabajo.id'], name='fk_trabajos_orden', ondelete='SET NULL', onupdate='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        mysql_engine='InnoDB',
    )
    for index_name, column in (
        ('idx_trabajos_diagnostico', 'diagnostico_id'),
        ('idx_trabajos_servicio', 'servicio_id'),
        ('idx_trabajos_mecanico', 'mecanico_id'),
        ('idx_trabajos_orden', 'orden_id'),
        ('idx_trabajos_estado', 'estado'),
    ):
        op.create_index(index_name, 'trabajos', [column])

    op.create_table(
        'imagenes_trabajo',
        sa.Column('id', mysql.INTEGER(unsigned=True), autoincrement=True, nullable=False),
        sa.Column('trabajo_id', mysql.INTEGER(unsigned=True), nullable=False),
        sa.Column('usuario_id', mysql.INTEGER(unsigned=True), nullable=False),
        sa.Column('ruta_imagen', sa.String(500), nullable=False),
        sa.Column('descripcion', sa.String(255), nullable=True),
        sa.Column('created_at', mysql.TIMESTAMP(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['trabajo_id'], ['trabajos.id'], name='fk_imagenes_trabajo', ondelete='CASCADE', onupdate='CASCADE'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], name='fk_imagenes_usuario', ondelete='RESTRICT', onupdate='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        mysql_engine='InnoDB',
    )
    op.create_index('idx_imagenes_trabajo', 'imagenes_trabajo', ['trabajo_id'])
    op.create_index('idx_imagenes_usuario', 'imagenes_trabajo', ['usuario_id'])

    op.create_table(
        'recibo_detalles',
        sa.Column('id', mysql.INTEGER(unsigned=True), autoincrement=True, nullable=False),
        sa.Column('recibo_id', mysql.INTEGER(unsigned=True), nullable=False),
        sa.Column('descripcion', sa.String(255), nullable=False),
        sa.Column('cantidad', mysql.INTEGER(unsigned=True), nullable=False, server_default='1'),
        sa.Column('precio_unitario', sa.Numeric(10, 2), nullable=False),
        sa.Column('subtotal', sa.Numeric(10, 2), nullable=False),
        sa.ForeignKeyConstraint(['recibo_id'], ['recibos.id'], name='fk_detalles_recibo', ondelete='CASCADE', onupdate='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        mysql_engine='InnoDB',
    )
    op.create_index('idx_detalles_recibo', 'recibo_detalles', ['recibo_id'])
    op.execute(sa.text(
        'INSERT INTO recibo_detalles (recibo_id, descripcion, cantidad, precio_unitario, subtotal) '
        'SELECT r.id, s.nombre, os.cantidad, os.precio, os.subtotal '
        'FROM orden_servicios os '
        'JOIN recibos r ON r.orden_id = os.orden_id '
        'JOIN servicios s ON s.id = os.servicio_id'
    ))

    _drop_foreign_keys_for_column('recibos', 'cliente_id')
    op.drop_column('recibos', 'cliente_id')
    op.drop_table('orden_servicios')
    op.drop_table('clientes')


def downgrade():
    raise RuntimeError('Esta migracion normaliza datos que no pueden reconstruirse automaticamente.')