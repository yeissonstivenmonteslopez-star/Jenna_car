import { getApiUrl, authHeaders, handleResponse } from '@/services/apiClient'

export async function getVehiculos(token?: string) {
  const res = await fetch(getApiUrl('/api/vehiculos'), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible cargar vehículos.')
}

export async function createVehiculo(data: Record<string, unknown>, token?: string) {
  const res = await fetch(getApiUrl('/api/vehiculos'), {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'No fue posible guardar el vehículo.')
}

export async function getAdminVehiculos(params?: { q?: string }, token?: string) {
  const query = params?.q ? `?q=${encodeURIComponent(params.q)}` : ''
  const res = await fetch(getApiUrl(`/api/admin/vehiculos${query}`), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible cargar los vehículos.')
}

export async function createAdminVehiculo(data: Record<string, unknown>, token?: string) {
  const res = await fetch(getApiUrl('/api/admin/vehiculos'), {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'No fue posible guardar el vehículo.')
}

export async function updateAdminVehiculo(vehiculoId: number, data: Record<string, unknown>, token?: string) {
  const res = await fetch(getApiUrl(`/api/admin/vehiculos/${vehiculoId}`), {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'No fue posible actualizar el vehículo.')
}

export async function deleteAdminVehiculo(vehiculoId: number, token?: string) {
  const res = await fetch(getApiUrl(`/api/admin/vehiculos/${vehiculoId}`), {
    method: 'DELETE',
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible eliminar el vehículo.')
}

export async function searchClientes(query = '', token?: string) {
  const res = await fetch(getApiUrl(`/api/admin/search?type=cliente&q=${encodeURIComponent(query)}`), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible cargar los clientes.')
}

export async function searchVehiculos(query = '', token?: string) {
  const res = await fetch(getApiUrl(`/api/admin/search?type=vehiculo&q=${encodeURIComponent(query)}`), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible cargar los vehículos.')
}
