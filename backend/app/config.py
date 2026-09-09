import os

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))


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
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024
    app.config['UPLOADS_PATH'] = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'uploads',
        'profile-photos',
    )
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url()
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
