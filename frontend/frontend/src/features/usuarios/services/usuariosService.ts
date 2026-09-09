import { getApiUrl, authHeaders, handleResponse } from '@/services/apiClient'

export async function getAdminUsuarios(token?: string) {
  const res = await fetch(getApiUrl('/api/admin/usuarios'), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'Error al cargar usuarios')
}

export async function bulkDeleteUsuarios(ids: number[], token?: string) {
  const res = await fetch(getApiUrl('/api/admin/usuarios/bulk'), {
    method: 'DELETE',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  return handleResponse(res, 'Error al eliminar usuarios')
}

export async function updateUsuarioRol(usuarioId: number, rol: string, token?: string) {
  const res = await fetch(getApiUrl(`/api/admin/usuarios/${usuarioId}/rol`), {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ rol }),
  })
  return handleResponse(res, 'Error al cambiar rol')
}

export async function getPerfil(token?: string) {
  const res = await fetch(getApiUrl('/api/auth/me'), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'No autorizado')
}

export async function updatePerfil(formData: FormData, token?: string) {
  const res = await fetch(getApiUrl('/api/usuarios/perfil'), {
    method: 'PUT',
    headers: { ...authHeaders(token) },
    body: formData,
  })
  return handleResponse(res, 'No fue posible actualizar el perfil.')
}

export async function uploadFotoPerfil(file: File, token?: string) {
  const body = new FormData()
  body.append('foto', file)
  const res = await fetch(getApiUrl('/api/usuarios/perfil/foto'), {
    method: 'POST',
    headers: { ...authHeaders(token) },
    body,
  })
  return handleResponse(res, 'No fue posible actualizar la foto.')
}

export async function adminSearch(params: { q?: string; type?: string }, token?: string) {
  const search = new URLSearchParams()
  if (params.q !== undefined) search.set('q', params.q)
  if (params.type) search.set('type', params.type)
  const res = await fetch(getApiUrl(`/api/admin/search?${search.toString()}`), {
    headers: { ...authHeaders(token) },
  })
  return handleResponse(res, 'Error en la búsqueda')
}
