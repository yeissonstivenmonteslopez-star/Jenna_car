from flask import Blueprint

from ..auth.decorators import jwt_required
from ..controllers import auth_controller


auth_bp = Blueprint('auth', __name__)


@auth_bp.post('/google')
def google_login():
    return auth_controller.google_login()


@auth_bp.post('/register')
def register():
    return auth_controller.register()


@auth_bp.post('/login')
def login():
    return auth_controller.login()


@auth_bp.get('/me')
@jwt_required()
def current_user():
    return auth_controller.current_user()


@auth_bp.post('/forgot-password')
@auth_bp.post('/password-reset/request')
def request_password_reset():
    return auth_controller.request_password_reset()


@auth_bp.post('/reset-password')
@auth_bp.post('/password-reset/confirm')
def confirm_password_reset_route():
    return auth_controller.confirm_password_reset_route()
