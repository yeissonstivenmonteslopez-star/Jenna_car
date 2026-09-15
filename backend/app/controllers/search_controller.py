from flask import jsonify, request

from ..services.search_s import buscar_admin


def admin_search():
    return jsonify({'data': buscar_admin(request.args.get('q', '').strip(), request.args.get('type', '').strip())})
