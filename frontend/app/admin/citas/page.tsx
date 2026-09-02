'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck2, CalendarClock, Check, PencilLine, Search, X } from 'lucide-react'
import { getApiUrl } from '@/lib/config'

const apiUrl = getApiUrl('')

interface Cita {
  id: number
  cliente: { id: number; nombre: string; apellido: string }
  vehiculo: { id: number; marca: string; modelo: string; placa: string }
  servicio: { id: number; name: string }
  fecha: string
  hora: string
  motivo: string
  observaciones: string
  estado: string
}

const estadosValidos = ['pendiente', 'confirmada', 'atendida', 'cancelada']

export default function AdminCitas() {
  const [token, setToken] = useState<string>('')
  const [citas, setCitas] = useState<Cita[]>([])
  const [message, setMessage] = useState<string>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newEstado, setNewEstado] = useState<string>('pendiente')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const summary = useMemo(() => ({
    pendientes: citas.filter((cita) => cita.estado === 'pendiente').length,
    confirmadas: citas.filter((cita) => cita.estado === 'confirmada').length,
    canceladas: citas.filter((cita) => cita.estado === 'cancelada').length,
  }), [citas])

  const pendientes = useMemo(() => citas.filter((c) => c.estado === 'pendiente'), [citas])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''
    setToken(token)
    if (!token) { window.location.href = '/sign-in'; return }
  }, [])

  const fetchCitas = async (authToken: string) => {
    const response = await fetch(`${apiUrl}/api/admin/citas`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    if (!response.ok) throw new Error()
    const data = await response.json()
    setCitas(data.data || [])
  }

  useEffect(() => {
    if (!token) return
    fetchCitas(token).catch(() => setMessage('Error al cargar citas'))
  }, [token])

  const cambiarEstadoRapido = async (citaId: number, estado: 'confirmada' | 'cancelada') => {
    if (!token) return
    setActionLoading(citaId)
    setMessage('')
    try {
      const response = await fetch(`${apiUrl}/api/admin/citas/${citaId}/estado`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      })
      const data = await response.json()
      if (!response.ok) { setMessage(data.error || 'Error al cambiar estado'); return }
      setMessage(`Cita #${citaId} → ${estado}`)
      await fetchCitas(token)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCambiarEstado = async (citaId: number) => {
    if (!token) return
    const response = await fetch(`${apiUrl}/api/admin/citas/${citaId}/estado`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: newEstado }),
    })
    const data = await response.json()
    if (!response.ok) { setMessage(data.error || 'Error al cambiar estado'); return }
    setMessage(`Estado cambiado a ${newEstado}`)
    setEditingId(null)
    await fetchCitas(token)
  }

  const filteredCitas = citas.filter((cita) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return [
      cita.cliente.nombre,
      cita.cliente.apellido,
      cita.vehiculo.marca,
      cita.vehiculo.modelo,
      cita.vehiculo.placa,
      cita.servicio.name,
      cita.estado,
    ].some((value) => value.toLowerCase().includes(term))
  })

  const badgeClass = (estado: string) => {
    if (estado === 'confirmada') return 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
    if (estado === 'atendida') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
    if (estado === 'cancelada') return 'bg-red-500/25 text-red-300 border border-red-500/50'
    return 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 py-8 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#f87171]">Administración</p>
            <h1 className="mt-3 font-serif text-4xl text-white md:text-5xl">Citas</h1>
          </div>
          <a href="/admin/dashboard" className="inline-flex items-center gap-2 rounded-full border border-[#f87171]/50 bg-[#f87171]/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f87171]">
            Dashboard
          </a>
        </header>

        {message && (
          <div className="mb-6 rounded-xl border border-[#f87171]/30 bg-[#f87171]/10 p-4 text-sm text-[#d6fff9]">
            {message}
          </div>
        )}

        {/* ── Contadores ── */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Pendientes</p>
            <p className="mt-4 font-serif text-3xl text-white">{summary.pendientes}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Confirmadas</p>
            <p className="mt-4 font-serif text-3xl text-white">{summary.confirmadas}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Canceladas</p>
            <p className="mt-4 font-serif text-3xl text-white">{summary.canceladas}</p>
          </div>
        </div>

        {/* ── Sección: Citas pendientes con acciones rápidas ── */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-yellow-400/20 bg-yellow-400/5 shadow-[0_20px_80px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-3 border-b border-yellow-400/15 p-5">
            <div className="rounded-lg bg-yellow-400/10 p-2 text-yellow-300">
              <CalendarClock size={18} />
            </div>
            <h2 className="font-serif text-2xl text-white">Citas pendientes</h2>
            {pendientes.length > 0 && (
              <span className="ml-auto rounded-full bg-yellow-400/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-300">
                {pendientes.length} por atender
              </span>
            )}
          </div>

          {pendientes.length === 0 ? (
            <div className="p-10 text-center text-sm text-white/50">No hay citas pendientes en este momento.</div>
          ) : (
            <div className="divide-y divide-yellow-400/10">
              {pendientes.map((cita) => (
                <div key={cita.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  {/* Info de la cita */}
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-300">#{cita.id}</span>
                      <span className="text-sm font-semibold text-white">
                        {cita.cliente.nombre} {cita.cliente.apellido}
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      {cita.vehiculo.marca} {cita.vehiculo.modelo}
                      <span className="ml-2 text-white/40">{cita.vehiculo.placa}</span>
                      <span className="mx-2 text-white/25">·</span>
                      {cita.servicio.name}
                    </p>
                    <p className="text-xs text-white/50">
                      {cita.fecha} a las {cita.hora}
                      {cita.motivo && <span className="ml-2 text-white/40">— {cita.motivo}</span>}
                    </p>
                  </div>

                  {/* Botones de acción rápida */}
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={actionLoading === cita.id}
                      onClick={() => cambiarEstadoRapido(cita.id, 'confirmada')}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#f87171] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1a0909] transition hover:bg-[#fca5a5] disabled:opacity-50"
                    >
                      <Check size={14} />
                      {actionLoading === cita.id ? '…' : 'Confirmar'}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === cita.id}
                      onClick={() => cambiarEstadoRapido(cita.id, 'cancelada')}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <X size={14} />
                      {actionLoading === cita.id ? '…' : 'Cancelar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Tabla completa de todas las citas ── */}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-[0_20px_80px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#f87171]/10 p-2 text-[#f87171]">
                <CalendarCheck2 size={18} />
              </div>
              <h2 className="font-serif text-2xl text-white">Agenda completa</h2>
            </div>
            <div className="relative w-full max-w-md">
              <Search size={16} className="absolute left-3 top-3.5 text-white/40" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cliente, vehículo o servicio"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#f87171]/60"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
                  <th className="p-4">ID</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Vehículo</th>
                  <th className="p-4">Servicio</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Hora</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredCitas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-16 text-center text-sm text-white/50">No hay citas registradas</td>
                  </tr>
                ) : (
                  filteredCitas.map((cita) => (
                    <tr key={cita.id} className="border-b border-white/10 text-sm text-white/80">
                      <td className="p-4 font-semibold text-white">#{cita.id}</td>
                      <td className="p-4">{cita.cliente.nombre} {cita.cliente.apellido}</td>
                      <td className="p-4">
                        {cita.vehiculo.marca} {cita.vehiculo.modelo}
                        <span className="ml-2 text-xs text-white/50">{cita.vehiculo.placa}</span>
                      </td>
                      <td className="p-4">{cita.servicio.name}</td>
                      <td className="p-4 text-white/60">{cita.fecha}</td>
                      <td className="p-4 text-white/60">{cita.hora}</td>
                      <td className="p-4">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass(cita.estado)}`}>
                          {cita.estado}
                        </span>
                      </td>
                      <td className="p-4">
                        {editingId === cita.id ? (
                          <div className="flex flex-col gap-2 md:flex-row">
                            <select
                              value={newEstado}
                              onChange={(event) => setNewEstado(event.target.value)}
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#f87171]/60"
                            >
                              {estadosValidos.map((estado) => (
                                <option key={estado} value={estado} className="bg-[#141414]">{estado}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleCambiarEstado(cita.id)}
                              className="rounded-lg bg-[#f87171] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1a0909] transition hover:bg-[#fca5a5]"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 hover:bg-white/5"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingId(cita.id); setNewEstado(cita.estado) }}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#f87171]/40 bg-[#f87171]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f87171]"
                          >
                            <PencilLine size={14} /> Cambiar
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

