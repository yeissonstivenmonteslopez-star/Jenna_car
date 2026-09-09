import { getApiUrl, authHeaders, handleResponse } from '@/services/apiClient'

export async function login(data: { email: string; password: string }) {
  const res = await fetch(getApiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'No fue posible iniciar sesión.')
}

export async function register(data: { nombre: string; apellido: string; email: string; password: string; telefono: string; documento?: string }) {
  const res = await fetch(getApiUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'No fue posible crear la cuenta.')
}

export async function googleAuth(id_token: string) {
  const res = await fetch(getApiUrl('/api/auth/google'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token }),
  })
  return handleResponse(res, 'No fue posible autenticar con Google.')
}

export async function forgotPassword(email: string) {
  const res = await fetch(getApiUrl('/api/auth/forgot-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return handleResponse(res, 'No fue posible enviar la solicitud.')
}

export async function resetPassword(data: { email: string; code: string; password: string }) {
  const res = await fetch(getApiUrl('/api/auth/reset-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res, 'No fue posible actualizar la contraseña.')
}

export async function getMe(token?: string) {
  const res = await fetch(getApiUrl('/api/auth/me'), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No autorizado')
}

export async function getAdminDashboard(token?: string) {
  const res = await fetch(getApiUrl('/api/admin/dashboard'), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No fue posible cargar el dashboard.')
}
