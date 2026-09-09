"""
LEGACY — compatibilidad histórica.

Este archivo existe solo por compatibilidad con invocaciones antiguas
``python backend/app.py``. El entrypoint canónico es ``backend/run.py``
(``from app import create_app; app = create_app(); app.run(...)``).

Se mantiene porque ``app = create_app()`` a nivel de módulo en
``app/__init__.py`` ya provee la instancia global, pero para no romper
scripts externos se conserva este shim. No se importa desde ningún otro
módulo interno (verificado con grep), por lo que podría eliminarse cuando
se confirme que nada externo lo usa.
"""

from app import app, create_app  # re-export para ``import app as backend_app``


if __name__ == '__main__':
    # Usa la misma lógica que run.py; create_app() crea una nueva instancia
    # con la config actual (la instancia global ``app`` ya existe).
    create_app().run(
        debug=app.config.get('DEBUG', True),
        host='0.0.0.0',
        port=5000,
    )