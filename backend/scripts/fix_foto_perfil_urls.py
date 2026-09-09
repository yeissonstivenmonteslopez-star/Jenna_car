from app import create_app
from app.extensions import db
from sqlalchemy import text

OLD_PREFIX = '/api/v2/users/profile-photos/'
NEW_PREFIX = '/uploads/profile-photos/'

def main():
    app = create_app()
    with app.app_context():
        result = db.session.execute(
            text("""
                UPDATE usuarios
                SET foto_perfil = CONCAT(:new_prefix, SUBSTRING(foto_perfil, LENGTH(:old_prefix) + 1))
                WHERE foto_perfil LIKE CONCAT(:old_prefix, '%')
            """),
            {'old_prefix': OLD_PREFIX, 'new_prefix': NEW_PREFIX},
        )
        db.session.commit()
        print(f'Filas actualizadas: {result.rowcount}')

if __name__ == '__main__':
    main()
