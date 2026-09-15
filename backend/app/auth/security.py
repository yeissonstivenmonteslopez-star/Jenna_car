"""Compatibilidad para imports antiguos de autenticación."""
from .decorators import jwt_required
from .jwt import create_access_token, decode_token
from .password import hash_password, verify_password
