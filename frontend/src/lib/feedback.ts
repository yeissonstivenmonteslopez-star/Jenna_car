/** Short display copy; keep the original error available to its caller. */
export function shortError(message: string): string {
  const text = message.trim()
  if (/failed to fetch|networkerror|network request failed|error de conexión|conectar con el servidor/i.test(text)) {
    return 'Error de conexión.'
  }
  if (/traceback|sqlalchemy|sqlstate|<html|<!doctype|stack trace/i.test(text)) {
    return 'No se pudo completar la operación.'
  }
  if (/contraseñas deben coincidir y tener/i.test(text)) return 'Las contraseñas no coinciden o son muy cortas.'
  if (/hasta seis fotos|como máximo seis fotografías/i.test(text)) return 'Máximo 6 fotos y 4 MB en total.'
  if (/al menos un servicio y una cantidad válida/i.test(text)) return 'Servicio o cantidad inválidos.'
  if (/placa debe tener|placa debe contener/i.test(text)) return 'La placa debe tener 3 letras y 3 números.'
  const summary = text.split(/\r?\n|(?<=[.!?])\s+/)[0]
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/;.*$/, '')
    .trim()
  return summary.length <= 140 ? summary : 'No se pudo completar la operación.'
}
