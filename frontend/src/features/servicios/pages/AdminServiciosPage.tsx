/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { BadgeDollarSign, CheckCircle2, ClipboardList, Clock3, PencilLine, Plus, Search, ShieldCheck, Sparkles, Trash2, Wrench } from 'lucide-react'
import { getAdminServicios, createServicio, updateServicio, deleteServicio } from '@/features/servicios/services/serviciosService'
import AdminBackLink from '@/components/admin-back-link'
import { formatCop } from '@/lib/utils'

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
  const [token] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    duracion_horas: '0',
    duracion_minutos: '30',
    estado: 'activo',
  })

  function formatDuration(totalMinutes: number | null | undefined) {
    const minutes = Number(totalMinutes || 0)
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (hours && remainingMinutes) return `${hours} h ${remainingMinutes} min`
    if (hours) return `${hours} h`
    return `${remainingMinutes} min`
  }

  const summary = useMemo(() => {
    const activeServices = services.filter((service) => service.estado === 'activo')
    return {
      total: services.length,
      activos: activeServices.length,
      inactivos: services.filter((service) => service.estado === 'inactivo').length,
      averagePrice: activeServices.length ? activeServices.reduce((total, service) => total + Number(service.precio || 0), 0) / activeServices.length : 0,
    }
  }, [services])

  async function loadServices(authToken: string) {
    const data = await getAdminServicios({ q: search || undefined, estado: filterEstado || undefined }, authToken)
    setServices(data.data || [])
  }

  useEffect(() => {
    if (!token) {
      window.location.href = '/sign-in'
      return
    }

    loadServices(token)
      .catch((error) => setMessage(error instanceof Error ? error.message : 'No fue posible cargar los servicios.'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial necesaria
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
      precio: '',
      duracion_horas: '0',
      duracion_minutos: '30',
      estado: 'activo',
    })
  }

  function selectService(service: Service) {
    setSelectedId(service.id)
    setForm({
      nombre: service.nombre,
      descripcion: service.descripcion || '',
      precio: String(service.precio),
      duracion_horas: String(Math.floor(Number(service.duracion_estimada || 30) / 60)),
      duracion_minutos: String(Number(service.duracion_estimada || 30) % 60),
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
      duracion_estimada: Number(form.duracion_horas) * 60 + Number(form.duracion_minutos),
      estado: form.estado,
    }

    if (!form.precio || Number(form.precio) <= 0) {
      setMessage('Ingresa un precio válido en pesos colombianos.')
      return
    }
    if (Number(form.duracion_horas) * 60 + Number(form.duracion_minutos) <= 0) {
      setMessage('Ingresa una duración mayor a cero.')
      return
    }
    if (Number(form.duracion_horas) > 24 || Number(form.duracion_minutos) > 59) {
      setMessage('La duración debe estar entre 0 y 24 horas, y entre 0 y 59 minutos.')
      return
    }

    try {
      if (selectedId) await updateServicio(selectedId, payload, token)
      else await createServicio(payload, token)
    } catch (err: any) {
      setMessage(err.message || 'No fue posible guardar el servicio.')
      return
    }

    setMessage(selectedId ? 'Servicio actualizado correctamente.' : 'Servicio creado correctamente.')
    resetForm()
    await loadServices(token)
  }

  async function toggleStatus(serviceId: number, nextState: string) {
    try {
      const data = await updateServicio(serviceId, { estado: nextState }, token)
      setMessage((data as any).message || 'Estado del servicio actualizado.')
    } catch (err: any) {
      setMessage(err.message || 'No fue posible cambiar el estado del servicio.')
      return
    }
    await loadServices(token)
  }

  async function removeService(serviceId: number) {
    const confirmed = window.confirm('¿Deseas eliminar este servicio? Si tiene relaciones, se desactivará en su lugar.')
    if (!confirmed) return

    try {
      const data = await deleteServicio(serviceId, token)
      setMessage((data as any).message || 'Servicio actualizado.')
    } catch (err: any) {
      setMessage(err.message || 'No fue posible eliminar el servicio.')
      return
    }
    resetForm()
    await loadServices(token)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 py-8 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3 text-[#f87171]">
              <div className="rounded-xl border border-[#f87171]/25 bg-[#f87171]/10 p-2.5"><Wrench size={18} /></div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em]">Administración / Catálogo</p>
            </div>
            <h1 className="mt-4 font-serif text-4xl text-white md:text-5xl">Servicios</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">Organiza el catálogo que verá tu equipo y define precios, tiempos y disponibilidad.</p>
          </div>
          <AdminBackLink />
        </header>

        {message && (
          <div className="mb-6 rounded-xl border border-[#f87171]/30 bg-[#f87171]/10 p-4 text-sm text-[#d6fff9]">
            {message}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
            <div className="flex items-center justify-between"><p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Catálogo total</p><ClipboardList size={17} className="text-white/35" /></div>
            <p className="mt-5 font-serif text-3xl text-white">{summary.total}</p>
            <p className="mt-2 text-xs text-white/40">servicios registrados</p>
          </div>
          <div className="rounded-2xl border border-[#70e9d2]/20 bg-[#70e9d2]/[0.06] p-5">
            <div className="flex items-center justify-between"><p className="text-[10px] uppercase tracking-[0.22em] text-[#70e9d2]/70">Disponibles</p><CheckCircle2 size={17} className="text-[#70e9d2]" /></div>
            <p className="mt-5 font-serif text-3xl text-white">{summary.activos}</p>
            <p className="mt-2 text-xs text-[#70e9d2]/60">servicios activos</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
            <div className="flex items-center justify-between"><p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Precio promedio</p><BadgeDollarSign size={17} className="text-[#f87171]" /></div>
            <p className="mt-5 font-serif text-2xl text-white">{formatCop(summary.averagePrice)}</p>
            <p className="mt-2 text-xs text-white/40">sobre servicios activos</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-[0_20px_80px_rgba(0,0,0,0.2)]">
            <div className="flex flex-col gap-4 border-b border-white/10 bg-white/[0.02] p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="font-serif text-2xl text-white">Catálogo de servicios</h2>
                  <p className="mt-1 text-xs text-white/40">Selecciona un servicio para editar sus detalles</p>
                </div>
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
                    <option key={option} value={option} className="bg-[#141414]">{option === 'activo' ? 'Activo' : 'Inactivo'}</option>
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
                    <article key={service.id} className={`flex flex-col gap-4 border-l-2 p-5 transition-colors md:flex-row md:items-center md:justify-between ${selectedId === service.id ? 'border-l-[#f87171] bg-[#f87171]/[0.04]' : 'border-l-transparent hover:bg-white/[0.025]'}`}>
                    <div className="flex items-start gap-4">
                      <div className="rounded-xl border border-[#f87171]/20 bg-[#f87171]/10 p-3 text-[#f87171]">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">{service.nombre}</p>
                        <p className="mt-1 max-w-xl text-sm text-white/50">{service.descripcion || 'Sin descripción'}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/50">
                          <span className="font-semibold text-[#70e9d2]">{formatCop(service.precio)}</span>
                          <span className="flex items-center gap-1"><Clock3 size={13} /> {formatDuration(service.duracion_estimada)}</span>
                          <span className={`rounded-full px-2 py-1 font-semibold uppercase tracking-[0.12em] ${service.estado === 'activo' ? 'bg-[#70e9d2]/10 text-[#70e9d2]' : 'bg-white/10 text-white/45'}`}>{service.estado}</span>
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
                  Precio en pesos colombianos (COP)
                  <div className="mt-1 flex items-center rounded-xl border border-white/10 bg-white/5 focus-within:border-[#f87171]/60">
                    <span className="pl-3 text-sm text-white/50">COP $</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={form.precio}
                      onChange={(event) => setForm({ ...form, precio: event.target.value })}
                      className="w-full bg-transparent px-2 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                </label>

                <div className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                  <span>Duración estimada</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="relative">
                      <input
                        required
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        value={form.duracion_horas}
                        onChange={(event) => setForm({ ...form, duracion_horas: event.target.value.replace(/\D/g, '') })}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pr-12 text-sm text-white outline-none focus:border-[#f87171]/60"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/35">horas</span>
                    </label>
                    <label className="relative">
                      <input
                        required
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        value={form.duracion_minutos}
                        onChange={(event) => setForm({ ...form, duracion_minutos: event.target.value.replace(/\D/g, '') })}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pr-14 text-sm text-white outline-none focus:border-[#f87171]/60"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/35">minutos</span>
                    </label>
                  </div>
                </div>
              </div>

              <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                Estado
                <div className="mt-1 grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-1">
                  {estadoOptions.map((option) => {
                    const isActive = form.estado === option
                    const isEnabled = option === 'activo'
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setForm({ ...form, estado: option })}
                        className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${isActive ? (isEnabled ? 'bg-[#70e9d2]/15 text-[#70e9d2] shadow-sm' : 'bg-white/10 text-white/80 shadow-sm') : 'text-white/35 hover:bg-white/5 hover:text-white/70'}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${isActive ? (isEnabled ? 'bg-[#70e9d2]' : 'bg-white/50') : 'bg-white/20'}`} />
                        {isEnabled ? 'Activo' : 'Inactivo'}
                      </button>
                    )
                  })}
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

