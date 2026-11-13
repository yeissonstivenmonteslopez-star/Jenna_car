"""Read-only compatibility for optional fields from older installations."""
from flask import g
from sqlalchemy import inspect, literal
from sqlalchemy.orm import with_expression
from ..extensions import db


def column_exists(table, column):
    cache = g.setdefault('jenna_schema_columns', {})
    if table not in cache:
        cache[table] = {item['name'] for item in inspect(db.session.connection()).get_columns(table)}
    return column in cache[table]


def optional_read(model, column):
    # None explicitly means the installed schema cannot represent this feature.
    return [] if column_exists(model.__tablename__, column) else [with_expression(getattr(model, column), literal(None))]
