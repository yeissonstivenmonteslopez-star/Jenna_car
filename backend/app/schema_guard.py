"""Runtime guard: application connections must never change database structure."""
import re


def prevent_schema_changes(connection, cursor, statement, parameters, context, executemany):
    if connection is not None and connection.get_execution_options().get('jenna_schema_migration') is True:
        return
    sql = re.sub(r'/\*.*?\*/|--[^\n]*', '', statement, flags=re.S).lstrip()
    if re.match(r'(CREATE|ALTER|DROP|TRUNCATE|RENAME)\b', sql, re.I):
        raise RuntimeError('Los cambios de esquema están deshabilitados en Jenna Car')
