import { getApiUrl, authHeaders, handleResponse } from '@/services/apiClient'

export async function getPagoConfig(token?: string) {
  const res = await fetch(getApiUrl('/api/pagos/config'), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible consultar el modo de pago.')
}

export async function getMisPagos(token?: string) {
  const res = await fetch(getApiUrl('/api/pagos/mis-pagos'), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible cargar pagos.')
}

export async function createPago(data: { recibo_id: number }, token?: string) {
  const res = await fetch(getApiUrl('/api/pagos'), {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'Error al procesar el pago')
}

export async function getOrdenes(token?: string) {
  const res = await fetch(getApiUrl('/api/admin/ordenes'), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible cargar las órdenes.')
}

export async function createOrden(data: Record<string, unknown>, token?: string) {
  const res = await fetch(getApiUrl('/api/admin/ordenes'), {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'No fue posible crear la orden.')
}

export async function updateOrden(ordenId: number, data: Record<string, unknown>, token?: string) {
  const res = await fetch(getApiUrl(`/api/admin/ordenes/${ordenId}`), {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'No fue posible actualizar la orden.')
}

export async function deleteOrden(ordenId: number, token?: string) {
  const res = await fetch(getApiUrl(`/api/admin/ordenes/${ordenId}`), {
    method: 'DELETE',
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible eliminar la orden.')
}

export async function enviarReciboOrden(ordenId: number, token?: string) {
  const res = await fetch(getApiUrl(`/api/admin/ordenes/${ordenId}/enviar-recibo`), {
    method: 'POST',
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible enviar el recibo.')
}
