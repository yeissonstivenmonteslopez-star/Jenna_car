from flask import jsonify

from ..services.dashboard_s import obtener_dashboard_admin


def admin_dashboard():
    return jsonify({'data': obtener_dashboard_admin()})
