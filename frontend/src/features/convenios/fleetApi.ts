import { getApiUrl, handleResponse } from '@/services/apiClient'

export interface Vehicle { id: number; placa: string; tipo_vehiculo: string | null; numero_interno: string | null; marca: string; modelo: string }
export interface Fleet {
  empresa: { id: number; nit: string; dias_credito: number; porcentaje_descuento: number }
  vehiculos: Vehicle[]
  servicios: { id: number; nombre: string }[]
}
export const fleetKey = 'jenna_car_convenio'
export async function fleetRequest<T>(path: string, token?: string, body?: object): Promise<T> {
  const response = await fetch(getApiUrl('/api/' + path), {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response, 'No se pudo completar la solicitud.')
}
