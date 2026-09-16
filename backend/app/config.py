import os
import secrets

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))


def is_debug() -> bool:
    return os.getenv('FLASK_DEBUG', 'false').lower() in {'1', 'true', 'yes'}


def cors_origins() -> list[str]:
    """Orígenes permitidos para el navegador. Si no se configura FRONTEND_ORIGIN,
    solo se permiten los orígenes locales de desarrollo (nunca '*').
    """
    configured = os.getenv('FRONTEND_ORIGIN', '').strip()
    if configured:
        return [origin.strip() for origin in configured.split(',') if origin.strip()]
    return ['http://localhost:5173', 'http://127.0.0.1:5173']


def database_url() -> str:
    configured = os.getenv('DATABASE_URL') or os.getenv('MYSQL_URL')
    if configured:
        return configured
    return (
        f"mysql+pymysql://{os.getenv('DB_USER', 'root')}:{os.getenv('DB_PASSWORD', '')}"
        f"@{os.getenv('DB_HOST', '127.0.0.1')}:{os.getenv('DB_PORT', '3306')}"
        f"/{os.getenv('DB_NAME', 'jenna_car')}?charset=utf8mb4"
    )


def apply_config(app) -> None:
    if os.getenv('SECRET_KEY'):
        app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    elif is_debug():
        app.config['SECRET_KEY'] = 'dev-secret-key'
    else:
        app.config['SECRET_KEY'] = secrets.token_hex(32)

    app.config['CORS_ORIGINS'] = cors_origins()
    app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024
    app.config['UPLOADS_PATH'] = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'uploads',
        'profile-photos',
    )
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url()
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
