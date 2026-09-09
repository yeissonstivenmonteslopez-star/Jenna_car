"""migrate foto_perfil prefix from /api/v2 to /uploads

Revision ID: b7f3c9e1a2d4
Revises: a8a75cb4e32e
Create Date: 2026-09-08

Elimina el prefijo muerto /api/v2/users/profile-photos/ que se guardaba
en usuarios.foto_perfil y lo reemplaza por /uploads/profile-photos/.
La ruta /uploads/... es la única fuente de verdad (app.add_url_rule en
app/__init__.py) y sobrevive tras eliminar /api/v2. Idempotente.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b7f3c9e1a2d4'
down_revision = 'a8a75cb4e32e'
branch_labels = None
depends_on = None

OLD_PREFIX = '/api/v2/users/profile-photos/'
NEW_PREFIX = '/uploads/profile-photos/'


def upgrade():
    # Idempotente: solo filas que aún tienen el prefijo antiguo
    op.execute(
        sa.text(
            "UPDATE usuarios SET foto_perfil = REPLACE(foto_perfil, :old, :new) "
            "WHERE foto_perfil LIKE :pattern"
        ).bindparams(old=OLD_PREFIX, new=NEW_PREFIX, pattern=f"{OLD_PREFIX}%")
    )


def downgrade():
    # Reversión idempotente
    op.execute(
        sa.text(
            "UPDATE usuarios SET foto_perfil = REPLACE(foto_perfil, :new, :old) "
            "WHERE foto_perfil LIKE :pattern"
        ).bindparams(new=NEW_PREFIX, old=OLD_PREFIX, pattern=f"{NEW_PREFIX}%")
    )
