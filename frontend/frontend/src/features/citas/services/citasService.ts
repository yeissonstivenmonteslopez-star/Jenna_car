import { getApiUrl, authHeaders, handleResponse } from '@/services/apiClient'

export async function getMisCitas(token?: string) {
  const res = await fetch(getApiUrl('/api/citas/mis-citas'), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible cargar tus citas.')
}

export async function createCita(data: { vehiculo_id: number; servicio_id: number; fecha: string; hora: string; motivo?: string }, token?: string) {
  const res = await fetch(getApiUrl('/api/citas'), {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'No fue posible agendar la cita.')
}

export async function checkDisponibilidad(data: { fecha: string; hora: string }, token?: string) {
  const res = await fetch(getApiUrl('/api/citas/disponibilidad'), {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'Horario no disponible')
}

export async function getAdminCitas(token?: string) {
  const res = await fetch(getApiUrl('/api/admin/citas'), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'Error al cargar citas')
}

export async function updateCitaEstado(citaId: number, estado: string, token?: string) {
  const res = await fetch(getApiUrl(`/api/admin/citas/${citaId}/estado`), {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  })
  return handleResponse(res, 'Error al cambiar estado')
}
