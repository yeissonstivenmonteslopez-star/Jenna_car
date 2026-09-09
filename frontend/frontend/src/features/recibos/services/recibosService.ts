import { getApiUrl, authHeaders, handleResponse, parseJsonSafe, ApiError, getStoredToken } from '@/services/apiClient'

export async function getMisRecibos(token?: string) {
  const res = await fetch(getApiUrl('/api/recibos/mis-recibos'), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible cargar recibos.')
}

export async function getReciboPdf(reciboId: number, opts?: { download?: boolean; token?: string }): Promise<Blob> {
  const qs = opts?.download ? '?download=true' : ''
  const res = await fetch(getApiUrl(`/api/recibos/${reciboId}/pdf${qs}`), {
    headers: { ...authHeaders(opts?.token) },
  })
  if (!res.ok) {
    const body = await parseJsonSafe(res) as { error?: string }
    throw new ApiError(body.error || 'No se pudo obtener el PDF del recibo', res.status, body)
  }
  return res.blob()
}

export function getReciboPdfUrl(reciboId: number, token?: string): string {
  const t = token ?? getStoredToken()
  return getApiUrl(`/api/recibos/${reciboId}/pdf?token=${encodeURIComponent(t)}`)
}
