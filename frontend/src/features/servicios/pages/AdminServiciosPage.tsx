/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from 'react'
import ServiceEditor, { estadoOptions } from './ServiceEditor'
import type { ServiceForm } from './ServiceEditor'
import type { FormEvent } from 'react'
import { BadgeDollarSign, CheckCircle2, ClipboardList, Clock3, PencilLine, Search, ShieldCheck, Sparkles, Trash2, Wrench } from 'lucide-react'
import { getAdminServicios, createServicio, updateServicio, deleteServicio } from '@/features/servicios/services/serviciosService'
import { formatCop } from '@/lib/utils'

type Service = {
  id: number
  nombre: string
  descripcion: string | null
  precio: number
  duracion_estimada: number | null
  estado: string
}


export default function AdminServiciosPage() {
  const [services, setServices] = useState<Service[]>([])
  const [token] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<ServiceForm>({
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

  const loadServices = useCallback(async (authToken: string) => {
    const data = await getAdminServicios({ q: search || undefined, estado: filterEstado || undefined }, authToken)
    setServices(data.data || [])
  }, [search, filterEstado])

  useEffect(() => {
    if (!token) { window.location.href = '/sign-in'; return }
    let active = true
    setLoading(true)
    getAdminServicios({ q: search || undefined, estado: filterEstado || undefined }, token)
      .then((data) => { if (active) setServices(data.data || []) })
      .catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : 'No fue posible cargar los servicios.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
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

          <ServiceEditor form={form} setForm={setForm} selectedId={selectedId} resetForm={resetForm} onSubmit={submit} />
        </div>
      </div>
    </main>
  )
}

