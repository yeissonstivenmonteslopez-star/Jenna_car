import { getApiUrl, authHeaders, handleResponse, parseJsonSafe, ApiError } from '@/services/apiClient'

export async function getNotificaciones(params?: { page?: number; per_page?: number }, token?: string) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.per_page) search.set('per_page', String(params.per_page))
  const qs = search.toString() ? `?${search.toString()}` : ''
  const res = await fetch(getApiUrl(`/api/notificaciones${qs}`), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'Error al cargar notificaciones')
}

export async function getNoLeidasCount(token?: string) {
  const res = await fetch(getApiUrl('/api/notificaciones/no-leidas/count'), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'Error al cargar conteo')
}

export async function marcarLeida(notificacionId: number, token?: string) {
  const res = await fetch(getApiUrl(`/api/notificaciones/${notificacionId}/leer`), {
    method: 'PATCH',
    headers: { ...authHeaders(token) },
  })
  if (!res.ok) {
    const body = await parseJsonSafe(res) as { error?: string }
    throw new ApiError(body.error || 'Error al marcar como leída', res.status, body)
  }
  return parseJsonSafe(res)
}

export async function marcarTodasLeidas(token?: string) {
  const res = await fetch(getApiUrl('/api/notificaciones/marcar-todas-leidas'), {
    method: 'PATCH',
    headers: { ...authHeaders(token) },
  })
  if (!res.ok) {
    const body = await parseJsonSafe(res) as { error?: string }
    throw new ApiError(body.error || 'Error al marcar todas como leídas', res.status, body)
  }
  return parseJsonSafe(res)
}

export async function getAdminNotificaciones(params?: { no_leidas?: boolean }, token?: string) {
  const qs = params?.no_leidas === false ? '' : params?.no_leidas ? '?no_leidas=true' : ''
  const res = await fetch(getApiUrl(`/api/admin/notificaciones${qs}`), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'Error al cargar notificaciones')
}

export async function createAdminNotificacion(data: { tipo: string; titulo: string; mensaje: string; usuario_id: number }, token?: string) {
  const res = await fetch(getApiUrl('/api/admin/notificaciones'), {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'Error al enviar la notificación')
}
