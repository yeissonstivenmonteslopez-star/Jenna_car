"""Comprobaciones de roles y permisos."""


def has_role(user, roles):
    return not roles or user.rol in roles


def is_active(user):
    return bool(user and user.estado == 'activo')