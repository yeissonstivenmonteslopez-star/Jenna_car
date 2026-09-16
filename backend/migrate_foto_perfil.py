"""
Migración de datos: corrige prefijo de foto_perfil en tabla usuarios.

Antes el código guardaba:
    /api/v2/users/profile-photos/{filename}
Ahora guarda:
    /uploads/profile-photos/{filename}
La ruta /uploads/... es servida directamente por
    app.add_url_rule('/uploads/profile-photos/<path:filename>', ...)
y no depende de ningún blueprint /api/v2.

Este script es idempotente: puede ejecutarse varias veces sin romper datos.
Si no hay filas con el prefijo antiguo, no hace nada.
"""
import os
import sys

# Permite ejecutar como `python backend/migrate_foto_perfil.py` o `python migrate_foto_perfil.py`
sys.path.insert(0, os.path.dirname(__file__))

from app import app, db
from sqlalchemy import text

OLD_PREFIX = '/api/v2/users/profile-photos/'
NEW_PREFIX = '/uploads/profile-photos/'


def migrate(dry_run: bool = False) -> int:
    """Ejecuta la migración y retorna número de filas afectadas."""
    with app.app_context():
        # Contar filas afectadas antes
        count = db.session.execute(
            text("SELECT COUNT(*) FROM usuarios WHERE foto_perfil LIKE :pattern"),
            {"pattern": f"{OLD_PREFIX}%"},
        ).scalar() or 0

        print(f"[migrate_foto_perfil] Filas con prefijo antiguo encontradas: {count}")

        if count == 0:
            print("[migrate_foto_perfil] Nada que migrar - ya está actualizado (idempotente).")
            return 0

        if dry_run:
            print("[migrate_foto_perfil] dry_run=True - no se aplican cambios.")
            return count

        # REPLACE no afecta a usuarios sin prefijo por el filtro WHERE
        result = db.session.execute(
            text("""
                UPDATE usuarios
                SET foto_perfil = REPLACE(foto_perfil, :old, :new)
                WHERE foto_perfil LIKE :pattern
            """),
            {"old": OLD_PREFIX, "new": NEW_PREFIX, "pattern": f"{OLD_PREFIX}%"},
        )
        db.session.commit()
        affected = result.rowcount if hasattr(result, 'rowcount') else count
        print(f"[migrate_foto_perfil] Filas actualizadas: {affected}")

        # Verificación idempotente: segunda pasada debe dar 0
        remaining = db.session.execute(
            text("SELECT COUNT(*) FROM usuarios WHERE foto_perfil LIKE :pattern"),
            {"pattern": f"{OLD_PREFIX}%"},
        ).scalar() or 0
        if remaining != 0:
            print(f"[migrate_foto_perfil] WARNING: aún quedan {remaining} filas con prefijo antiguo")
        else:
            print("[migrate_foto_perfil] Migración completada correctamente.")

        return affected


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description="Migra foto_perfil de /api/v2/... a /uploads/...")
    parser.add_argument('--dry-run', action='store_true', help='Solo contar sin actualizar')
    args = parser.parse_args()

    try:
        migrated = migrate(dry_run=args.dry_run)
        sys.exit(0)
    except Exception as exc:
        print(f"[migrate_foto_perfil] ERROR: {exc}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        sys.exit(1)
