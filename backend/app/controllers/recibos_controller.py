from flask import jsonify, request, send_file
from ..services import recibos_s as receipt_service

def mis_recibos():
    data = receipt_service.list_for_user(request.current_user.id)
    if data is None: return jsonify({'error': 'El usuario no tiene perfil de cliente'}), 403
    return jsonify({'data': data})

def recibo_pdf(recibo_id):
    recibo, error, status = receipt_service.find_owned(request.current_user, recibo_id)
    if error: return jsonify({'error': error}), status
    download = request.args.get('download', '').lower() in {'1', 'true', 'yes'}
    return send_file(receipt_service.pdf(recibo), mimetype='application/pdf', as_attachment=download, download_name=f'recibo-ORDEN-{str(recibo.orden_id).zfill(3)}.pdf')
