
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ClipboardList, PencilLine, Plus, Search, ShieldCheck, Sparkles, Trash2, Wrench } from 'lucide-react'
import { getApiUrl } from '@/lib/config'
import AdminBackLink from '@/components/admin-back-link'

const apiUrl = getApiUrl('')

type Service = {
  id: number
  nombre: string
  descripcion: string | null
  precio: number
  duracion_estimada: number | null
  estado: string
}

const estadoOptions = ['activo', 'inactivo']

export default function AdminServiciosPage() {
  const [services, setServices] = useState<Service[]>([])
  const [token, setToken] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '0',
    duracion_estimada: '30',
    estado: 'activo',
  })

  const summary = useMemo(() => ({
    activos: services.filter((s) => s.estado === 'activo').length,
    inactivos: services.filter((s) => s.estado === 'inactivo').length,
  }), [services])

  async function loadServices(authToken: string) {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (filterEstado) params.set('estado', filterEstado)

    const response = await fetch(`${apiUrl}/api/admin/servicios?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'No fue posible cargar los servicios.')
    }
    const data = await response.json()
    setServices(data.data || [])
  }

  useEffect(() => {
    const storedToken = localStorage.getItem('jenna_car_token') || ''
    setToken(storedToken)
    if (!storedToken) {
      window.location.href = '/sign-in'
      return
    }

    loadServices(storedToken)
      .catch((error) => setMessage(error instanceof Error ? error.message : 'No fue posible cargar los servicios.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    loadServices(token)
      .catch((error) => setMessage(error instanceof Error ? error.message : 'No fue posible cargar los servicios.'))
      .finally(() => setLoading(false))
  }, [search, filterEstado, token])

  function resetForm() {
    setSelectedId(null)
    setForm({
      nombre: '',
      descripcion: '',
      precio: '0',
      duracion_estimada: '30',
      estado: 'activo',
    })
  }

  function selectService(service: Service) {
    setSelectedId(service.id)
    setForm({
      nombre: service.nombre,
      descripcion: service.descripcion || '',
      precio: String(service.precio),
      duracion_estimada: String(service.duracion_estimada ?? 30),
      estado: service.estado,
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      precio: Number(form.precio),
      duracion_estimada: Number(form.duracion_estimada),
      estado: form.estado,
    }

    const response = await fetch(`${apiUrl}/api/admin/servicios${selectedId ? `/${selectedId}` : ''}`, {
      method: selectedId ? 'PUT' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMessage(data.error || 'No fue posible guardar el servicio.')
      return
    }

    setMessage(selectedId ? 'Servicio actualizado correctamente.' : 'Servicio creado correctamente.')
    resetForm()
    await loadServices(token)
  }

  async function toggleStatus(serviceId: number, nextState: string) {
    const response = await fetch(`${apiUrl}/api/admin/servicios/${serviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ estado: nextState }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMessage(data.error || 'No fue posible cambiar el estado del servicio.')
      return
    }
    setMessage(data.message || 'Estado del servicio actualizado.')
    await loadServices(token)
  }

  async function removeService(serviceId: number) {
    const confirmed = window.confirm('¿Deseas eliminar este servicio? Si tiene relaciones, se desactivará en su lugar.')
    if (!confirmed) return

    const response = await fetch(`${apiUrl}/api/admin/servicios/${serviceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMessage(data.error || 'No fue posible eliminar el servicio.')
      return
    }

    setMessage(data.message || 'Servicio actualizado.')
    resetForm()
    await loadServices(token)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 py-8 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#f87171]">Administración</p>
            <h1 className="mt-3 font-serif text-4xl text-white md:text-5xl">Servicios</h1>
          </div>
          <AdminBackLink />
        </header>

        {message && (
          <div className="mb-6 rounded-xl border border-[#f87171]/30 bg-[#f87171]/10 p-4 text-sm text-[#d6fff9]">
            {message}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Activos</p>
            <p className="mt-4 font-serif text-3xl text-white">{summary.activos}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Inactivos</p>
            <p className="mt-4 font-serif text-3xl text-white">{summary.inactivos}</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-[0_20px_80px_rgba(0,0,0,0.2)]">
            <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#f87171]/10 p-2 text-[#f87171]">
                  <Wrench size={18} />
                </div>
                <h2 className="font-serif text-2xl text-white">Catálogo</h2>
              </div>
              <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-3.5 text-white/40" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar servicio"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#f87171]/60"
                  />
                </div>
                <select
                  value={filterEstado}
                  onChange={(event) => setFilterEstado(event.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                >
                  <option value="" className="bg-[#141414]">Todos</option>
                  {estadoOptions.map((option) => (
                    <option key={option} value={option} className="bg-[#141414]">{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-6 text-sm text-white/60">Cargando servicios...</div>
            ) : services.length === 0 ? (
              <div className="p-6 text-sm text-white/60">No hay servicios registrados.</div>
            ) : (
              <div className="divide-y divide-white/10">
                {services.map((service) => (
                  <article key={service.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="rounded-xl bg-[#f87171]/10 p-3 text-[#f87171]">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">{service.nombre}</p>
                        <p className="mt-1 text-sm text-white/70">{service.descripcion || 'Sin descripción'} · {service.duracion_estimada ?? 0} min</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/60">
                          <span className="rounded-full bg-white/5 px-2 py-1">€{Number(service.precio).toFixed(2)}</span>
                          <span className="rounded-full bg-white/5 px-2 py-1">{service.estado}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <button type="button" onClick={() => selectService(service)} className="inline-flex items-center gap-2 rounded-lg border border-[#f87171]/40 bg-[#f87171]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f87171]">
                        <PencilLine size={14} /> Editar
                      </button>
                      <button type="button" onClick={() => toggleStatus(service.id, service.estado === 'activo' ? 'inactivo' : 'activo')} className="inline-flex items-center gap-2 rounded-lg border border-yellow-400/40 bg-yellow-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-100">
                        <ShieldCheck size={14} /> {service.estado === 'activo' ? 'Desactivar' : 'Activar'}
                      </button>
                      <button type="button" onClick={() => removeService(service.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200">
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#f87171]/10 p-2 text-[#f87171]">
                  {selectedId ? <PencilLine size={18} /> : <Plus size={18} />}
                </div>
                <h2 className="font-serif text-2xl text-white">{selectedId ? `Editar #${selectedId}` : 'Nuevo'}</h2>
              </div>
              {selectedId && (
                <button type="button" onClick={resetForm} className="text-xs uppercase tracking-[0.18em] text-[#f87171]">Nuevo</button>
              )}
            </div>

            <form onSubmit={submit} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                Nombre
                <input
                  required
                  value={form.nombre}
                  onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                  className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                />
              </label>

              <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                Descripción
                <textarea
                  value={form.descripcion}
                  onChange={(event) => setForm({ ...form, descripcion: event.target.value })}
                  className="mt-1 min-h-[110px] rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                  Precio
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.precio}
                    onChange={(event) => setForm({ ...form, precio: event.target.value })}
                    className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                  />
                </label>

                <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                  Duración
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.duracion_estimada}
                    onChange={(event) => setForm({ ...form, duracion_estimada: event.target.value })}
                    className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                Estado
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <ClipboardList size={15} className="text-[#f87171]" />
                  <select
                    value={form.estado}
                    onChange={(event) => setForm({ ...form, estado: event.target.value })}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  >
                    {estadoOptions.map((option) => (
                      <option key={option} value={option} className="bg-[#141414]">{option}</option>
                    ))}
                  </select>
                </div>
              </label>

              <button type="submit" className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#f87171] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1a0909] transition hover:bg-[#fca5a5]">
                <Sparkles size={15} />
                {selectedId ? 'Guardar cambios' : 'Crear servicio'}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </main>
  )
}

