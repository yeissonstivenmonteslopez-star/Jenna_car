import { getApiUrl, authHeaders, handleResponse } from '@/services/apiClient'

export async function getServices() {
  const res = await fetch(getApiUrl('/api/services'))
  return handleResponse(res, 'No fue posible cargar servicios.')
}

export async function getAdminServicios(params?: { q?: string; estado?: string }, token?: string) {
  const search = new URLSearchParams()
  if (params?.q) search.set('q', params.q)
  if (params?.estado) search.set('estado', params.estado)
  const qs = search.toString() ? `?${search.toString()}` : ''
  const res = await fetch(getApiUrl(`/api/admin/servicios${qs}`), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible cargar los servicios.')
}

export async function createServicio(data: Record<string, unknown>, token?: string) {
  const res = await fetch(getApiUrl('/api/admin/servicios'), {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'No fue posible guardar el servicio.')
}

export async function updateServicio(servicioId: number, data: Record<string, unknown>, token?: string) {
  const res = await fetch(getApiUrl(`/api/admin/servicios/${servicioId}`), {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'No fue posible actualizar el servicio.')
}

export async function deleteServicio(servicioId: number, token?: string) {
  const res = await fetch(getApiUrl(`/api/admin/servicios/${servicioId}`), {
    method: 'DELETE',
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible eliminar el servicio.')
}
