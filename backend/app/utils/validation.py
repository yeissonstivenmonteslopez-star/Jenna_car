import re
from datetime import datetime


def validar_placa(placa: str) -> str:
    placa_normalizada = (placa or '').strip().upper()
    placa_normalizada = re.sub(r'[^A-Z0-9]', '', placa_normalizada)
    if not placa_normalizada:
        raise ValueError('La placa es obligatoria.')
    placa_pattern = re.compile(r'^[A-Z]{3}[0-9]{3}$')
    if not placa_pattern.fullmatch(placa_normalizada):
        raise ValueError('La placa debe tener exactamente 3 letras y 3 números.')
    return placa_normalizada


def validar_hora_cita(hora: str):
    try:
        hora_obj = datetime.strptime(str(hora), '%H:%M:%S').time()
    except ValueError:
        try:
            hora_obj = datetime.strptime(str(hora), '%H:%M').time()
        except ValueError:
            raise ValueError('La hora debe tener formato HH:MM o HH:MM:SS')

    if hora_obj > datetime.strptime('19:00', '%H:%M').time():
        raise ValueError('No se pueden agendar citas después de las 19:00.')

    return hora_obj


def validar_fecha_cita(fecha: str, *, permitir_pasada: bool = False):
    try:
        fecha_obj = datetime.strptime(str(fecha), '%Y-%m-%d').date()
    except (TypeError, ValueError):
        raise ValueError('La fecha debe tener formato YYYY-MM-DD')
    if not permitir_pasada and fecha_obj < datetime.now().date():
        raise ValueError('No se pueden crear citas en fechas pasadas')
    return fecha_obj
