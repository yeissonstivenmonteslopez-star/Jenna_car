
import { useEffect, useMemo, useState } from 'react'
import { Search, ShieldCheck, Trash2, Users } from 'lucide-react'
import { getApiUrl } from '@/lib/config'
import AdminBackLink from '@/components/admin-back-link'

const apiUrl = getApiUrl('')
const protectedEmails = new Set(['yeisson@gmail.com', 'admin3@jenna.com'])

interface User {
  id: number
  nombre: string
  apellido: string
  email: string
  telefono?: string
  rol: string
  estado: string
  foto_perfil?: string
  created_at: string
}

export default function AdminUsuarios() {
  const [users, setUsers] = useState<User[]>([])
  const [token, setToken] = useState<string>('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [newRol, setNewRol] = useState<string>('usuario')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const summary = useMemo(() => ({
    admins: users.filter((user) => user.rol === 'admin').length,
    usuarios: users.filter((user) => user.rol === 'usuario').length,
    activos: users.filter((user) => user.estado === 'activo').length,
  }), [users])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''
    setToken(token)
    if (!token) { window.location.href = '/sign-in'; return }
  }, [])

  useEffect(() => {
    if (!token) return
    fetch(`${apiUrl}/api/admin/usuarios`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error()
        const data = await r.json()
        setUsers(data.data || [])
      })
      .catch(() => setMessage('Error al cargar usuarios'))
  }, [token])

  const filteredUsers = users.filter((user) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return [user.nombre, user.apellido, user.email, user.telefono || '', user.rol, user.estado].some((value) => value.toLowerCase().includes(term))
  })

  const selectableUsers = filteredUsers.filter((user) => !protectedEmails.has(user.email.toLowerCase()))
  const allVisibleSelected = selectableUsers.length > 0 && selectableUsers.every((user) => selectedIds.includes(user.id))

  const toggleSelected = (userId: number) => {
    setSelectedIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId])
  }

  const handleEliminarSeleccionados = async () => {
    if (!token || !selectedIds.length) return
    if (!window.confirm(`¿Eliminar ${selectedIds.length} usuario(s) y sus datos relacionados?`)) return
    const response = await fetch(`${apiUrl}/api/admin/usuarios/bulk`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds }),
    })
    const data = await response.json()
    if (!response.ok) return setMessage(data.error || 'Error al eliminar usuarios')
    setUsers((current) => current.filter((user) => !selectedIds.includes(user.id)))
    setSelectedIds([])
    setMessage(`${data.deleted} usuario(s) eliminado(s)`)
  }

  const handleCambiarRol = async (usuarioId: number) => {
    if (!token) return
    const response = await fetch(`${apiUrl}/api/admin/usuarios/${usuarioId}/rol`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol: newRol }),
    })
    const data = await response.json()
    if (!response.ok) return setMessage(data.error || 'Error al cambiar rol')
    setMessage(`Rol cambiado a ${newRol}`)
    setNewRol('usuario')
    setEditing(null)
    const refresh = await fetch(`${apiUrl}/api/admin/usuarios`, { headers: { Authorization: `Bearer ${token}` } })
    if (refresh.ok) {
      const payload = await refresh.json()
      setUsers(payload.data || [])
    }
  }

  const badgeClass = (rol: string) => rol === 'admin' ? 'bg-[#f87171]/15 text-[#f87171]' : 'bg-white/10 text-white/80'

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 py-8 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#f87171]">Administración</p>
            <h1 className="mt-3 font-serif text-4xl text-white md:text-5xl">Usuarios</h1>
          </div>
          <AdminBackLink />
        </header>

        {message && (
          <div className="mb-6 rounded-xl border border-[#f87171]/30 bg-[#f87171]/10 p-4 text-sm text-[#d6fff9]">
            {message}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Admins</p>
            <p className="mt-4 font-serif text-3xl text-white">{summary.admins}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Usuarios</p>
            <p className="mt-4 font-serif text-3xl text-white">{summary.usuarios}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Activos</p>
            <p className="mt-4 font-serif text-3xl text-white">{summary.activos}</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-[0_20px_80px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#f87171]/10 p-2 text-[#f87171]">
                <Users size={18} />
              </div>
              <h2 className="font-serif text-2xl text-white">Listado</h2>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {selectedIds.length > 0 && (
                <button onClick={handleEliminarSeleccionados} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white hover:bg-red-500">
                  <Trash2 size={14} /> Eliminar ({selectedIds.length})
                </button>
              )}
            <div className="relative w-full max-w-md">
              <Search size={16} className="absolute left-3 top-3.5 text-white/40" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar usuario"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#f87171]/60"
              />
            </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
                  <th className="p-4"><input type="checkbox" aria-label="Seleccionar usuarios visibles" checked={allVisibleSelected} onChange={() => setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !selectableUsers.some((user) => user.id === id)) : Array.from(new Set([...current, ...selectableUsers.map((user) => user.id)])))} /></th>
                  <th className="p-4">ID</th>
                  <th className="p-4">Usuario</th>
                  <th className="p-4">Correo</th>
                  <th className="p-4">Teléfono</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-16 text-center text-sm text-white/50">No hay usuarios registrados</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/10 text-sm text-white/80">
                      <td className="p-4"><input type="checkbox" aria-label={`Seleccionar ${user.email}`} disabled={protectedEmails.has(user.email.toLowerCase())} checked={selectedIds.includes(user.id)} onChange={() => toggleSelected(user.id)} /></td>
                      <td className="p-4 font-semibold text-white">#{user.id}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {user.foto_perfil ? (
                            <img src={`${apiUrl}${user.foto_perfil}`} alt={`${user.nombre} ${user.apellido}`} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f87171]/15 text-xs font-semibold text-[#f87171]">
                              {user.nombre.charAt(0)}{user.apellido.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">{user.nombre} {user.apellido}</p>
                            <p className="text-xs text-white/50">{user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : 'Sin fecha'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-white/60">{user.email}</td>
                      <td className="p-4 text-white/60">{user.telefono || 'N/A'}</td>
                      <td className="p-4">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass(user.rol)}`}>
                          {user.rol}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${user.estado === 'activo' ? 'bg-[#f87171]/15 text-[#f87171]' : 'bg-white/10 text-white/70'}`}>
                          {user.estado}
                        </span>
                      </td>
                      <td className="p-4">
                        {editing === user.id ? (
                          <div className="flex flex-col gap-2 md:flex-row">
                            <select
                              value={newRol}
                              onChange={(event) => setNewRol(event.target.value)}
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#f87171]/60"
                            >
                              <option value="usuario" className="bg-[#141414]">usuario</option>
                              <option value="admin" className="bg-[#141414]">admin</option>
                            </select>
                            <button
                              onClick={() => handleCambiarRol(user.id)}
                              className="rounded-lg bg-[#f87171] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1a0909] transition hover:bg-[#fca5a5]"
                            >
                              Aplicar
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 hover:bg-white/5"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditing(user.id)
                              setNewRol(user.rol)
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#f87171]/40 bg-[#f87171]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f87171]"
                          >
                            <ShieldCheck size={14} /> Cambiar rol
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

