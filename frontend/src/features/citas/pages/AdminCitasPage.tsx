/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck2, PencilLine, Search } from 'lucide-react'
import { asignarMecanico, getAdminCitas, updateCitaEstado } from '@/features/citas/services/citasService'
import { getAdminUsuarios } from '@/features/usuarios/services/usuariosService'

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
  mecanico_id: number | null
}

interface Mechanic {
  id: number
  nombre: string
  apellido: string
  rol: string
}

const estadosValidos = ['pendiente', 'confirmada', 'atendida', 'cancelada']

export default function AdminCitas() {
  const [token] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''))
  const [citas, setCitas] = useState<Cita[]>([])
  const [mecanicos, setMecanicos] = useState<Mechanic[]>([])
  const [message, setMessage] = useState<string>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newEstado, setNewEstado] = useState<string>('pendiente')
  const [search, setSearch] = useState('')
  const [assigningId, setAssigningId] = useState<number | null>(null)

  const summary = useMemo(() => ({
    pendientes: citas.filter((cita) => cita.estado === 'pendiente').length,
    confirmadas: citas.filter((cita) => cita.estado === 'confirmada').length,
    canceladas: citas.filter((cita) => cita.estado === 'cancelada').length,
  }), [citas])


  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''
    if (!token) { window.location.href = '/sign-in'; return }
  }, [])

  const fetchCitas = async (authToken: string) => {
    const [citaData, userData] = await Promise.all([getAdminCitas(authToken), getAdminUsuarios(authToken)])
    setCitas(citaData.data || [])
    setMecanicos((userData.data || []).filter((user: Mechanic) => user.rol === 'mecanico'))
  }

  const handleAsignarMecanico = async (citaId: number, value: string) => {
    setAssigningId(citaId)
    setMessage('')
    try {
      const response = await asignarMecanico(citaId, value ? Number(value) : null, token)
      setCitas((previous) => previous.map((cita) => cita.id === citaId ? { ...cita, ...response.data } : cita))
      setMessage(value ? `Mecánico asignado a la cita #${citaId}.` : `Mecánico retirado de la cita #${citaId}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible asignar el mecánico.')
    } finally {
      setAssigningId(null)
    }
  }

  useEffect(() => {
    if (!token) return
    fetchCitas(token).catch(() => setMessage('Error al cargar citas'))
  }, [token])

  const handleCambiarEstado = async (citaId: number) => {
    if (!token) return
    try {
      await updateCitaEstado(citaId, newEstado, token)
      setMessage(`Estado cambiado a ${newEstado}`)
    } catch (err: any) {
      setMessage(err.message || 'Error al cambiar estado'); return
    }
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
        </header>

        {message && (
          <div className="mb-6 rounded-xl border border-[#f87171]/30 bg-[#f87171]/10 p-4 text-sm text-[#d6fff9]">
            {message}
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-5 text-xs text-white/60" aria-label="Resumen de citas">
          <span>Pendientes <strong className="ml-1 text-white">{summary.pendientes}</strong></span>
          <span>Confirmadas <strong className="ml-1 text-white">{summary.confirmadas}</strong></span>
          <span>Canceladas <strong className="ml-1 text-white">{summary.canceladas}</strong></span>
        </div>

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
                  <th className="p-4">Mecánico</th>
                  <th className="p-4">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredCitas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-16 text-center text-sm text-white/50">No hay citas registradas</td>
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
                        {editingId === cita.id ? <div className="flex flex-col items-start gap-2"><select
                          value={cita.mecanico_id ? String(cita.mecanico_id) : ''}
                          disabled={assigningId === cita.id}
                          aria-label={`Mecánico asignado a la cita ${cita.id}`}
                          onChange={(event) => void handleAsignarMecanico(cita.id, event.target.value)}
                          className="min-w-36 rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-xs text-white outline-none transition focus:border-[#f87171]/60 disabled:opacity-50"
                        >
                          <option value="" className="bg-[#141414]">Sin asignar</option>
                          {mecanicos.map((mecanico) => (
                            <option key={mecanico.id} value={mecanico.id} className="bg-[#141414]">{mecanico.nombre} {mecanico.apellido}</option>
                          ))}
                        </select>
                        </div> : <div className="flex flex-col items-start gap-2">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass(cita.mecanico_id ? 'confirmada' : 'pendiente')}`}>
                            {cita.mecanico_id ? 'Asignado' : 'Sin asignar'}
                          </span>
                        </div>}
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
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
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

