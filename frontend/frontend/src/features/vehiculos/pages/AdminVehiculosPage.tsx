/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CarFront, Fuel, Gauge, PencilLine, Plus, Search, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { getAdminVehiculos, createAdminVehiculo, updateAdminVehiculo, deleteAdminVehiculo, searchClientes } from '@/features/vehiculos/services/vehiculosService'
// ShieldCheck re-used for the activate/deactivate toggle

type Vehicle = {
  id: number
  cliente_id: number
  cliente?: { id: number; nombre: string; apellido: string; email: string } | null
  placa: string
  marca: string
  modelo: string
  anio: number | null
  color: string | null
  kilometraje: number
  tipo_combustible: string
  estado: string
}

type ClientOption = {
  id: number
  nombre: string
  apellido: string
  email: string
}

const combustibleOptions = ['gasolina', 'diesel', 'hibrido', 'electrico', 'gas']
const estadoOptions = ['activo', 'en_mantenimiento', 'inactivo']

export default function AdminVehiculosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [token] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    cliente_id: '',
    placa: '',
    marca: '',
    modelo: '',
    anio: '',
    color: '',
    kilometraje: '0',
    tipo_combustible: 'gasolina',
    estado: 'activo',
  })

  const summary = useMemo(() => ({
    activos: vehicles.filter((v) => v.estado === 'activo').length,
    mantenimiento: vehicles.filter((v) => v.estado === 'en_mantenimiento').length,
    inactivos: vehicles.filter((v) => v.estado === 'inactivo').length,
  }), [vehicles])

  async function loadClients(authToken: string) {
    const data = await searchClientes('', authToken)
    setClients((data.data?.clientes || []).map((item: Record<string, unknown>) => ({
      id: item.id,
      nombre: item.nombre,
      apellido: item.apellido,
      email: item.email,
    })))
  }

  async function loadVehicles(authToken: string) {
    const data = await getAdminVehiculos({ q: search }, authToken)
    setVehicles(data.data || [])
  }

  useEffect(() => {
    if (!token) {
      window.location.href = '/sign-in'
      return
    }

    Promise.all([loadClients(token), loadVehicles(token)])
      .catch((error) => setMessage(error instanceof Error ? error.message : 'No fue posible cargar los datos.'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial necesaria
    setLoading(true)
    loadVehicles(token)
      .catch((error) => setMessage(error instanceof Error ? error.message : 'No fue posible cargar los vehículos.'))
      .finally(() => setLoading(false))
  }, [search, token])

  function resetForm() {
    setSelectedId(null)
    setForm({
      cliente_id: '',
      placa: '',
      marca: '',
      modelo: '',
      anio: '',
      color: '',
      kilometraje: '0',
      tipo_combustible: 'gasolina',
      estado: 'activo',
    })
  }

  function selectVehicle(vehicle: Vehicle) {
    setSelectedId(vehicle.id)
    setForm({
      cliente_id: String(vehicle.cliente_id),
      placa: vehicle.placa,
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      anio: vehicle.anio ? String(vehicle.anio) : '',
      color: vehicle.color || '',
      kilometraje: String(vehicle.kilometraje),
      tipo_combustible: vehicle.tipo_combustible,
      estado: vehicle.estado,
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    const payload = {
      cliente_id: Number(form.cliente_id),
      placa: form.placa,
      marca: form.marca,
      modelo: form.modelo,
      anio: form.anio ? Number(form.anio) : null,
      color: form.color || null,
      kilometraje: Number(form.kilometraje),
      tipo_combustible: form.tipo_combustible,
      estado: form.estado,
    }

    try {
      if (selectedId) await updateAdminVehiculo(selectedId, payload, token)
      else await createAdminVehiculo(payload, token)
    } catch (err: any) {
      setMessage(err.message || 'No fue posible guardar el vehículo.')
      return
    }

    setMessage(selectedId ? 'Vehículo actualizado correctamente.' : 'Vehículo creado correctamente.')
    resetForm()
    await loadVehicles(token)
  }

  async function removeVehicle(vehicleId: number) {
    const confirmed = window.confirm('¿Deseas eliminar este vehículo? Si tiene citas u órdenes asociadas, se desactivará en su lugar.')
    if (!confirmed) return

    try {
      const data = await deleteAdminVehiculo(vehicleId, token)
      setMessage((data as any).message || 'Vehículo actualizado.')
    } catch (err: any) {
      setMessage(err.message || 'No fue posible eliminar el vehículo.')
      return
    }
    resetForm()
    await loadVehicles(token)
  }

  async function toggleStatus(vehicleId: number, nextState: string) {
    try {
      const data = await updateAdminVehiculo(vehicleId, { estado: nextState }, token)
      setMessage((data as any).message || 'Estado del vehículo actualizado.')
    } catch (err: any) {
      setMessage(err.message || 'No fue posible cambiar el estado del vehículo.')
      return
    }
    await loadVehicles(token)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 py-8 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#f87171]">Administración</p>
            <h1 className="mt-3 font-serif text-4xl text-white md:text-5xl">Vehículos</h1>
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

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Activos</p>
            <p className="mt-4 font-serif text-3xl text-white">{summary.activos}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Mantenimiento</p>
            <p className="mt-4 font-serif text-3xl text-white">{summary.mantenimiento}</p>
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
                  <CarFront size={18} />
                </div>
                <h2 className="font-serif text-2xl text-white">Inventario</h2>
              </div>
              <div className="relative w-full max-w-md">
                <Search size={16} className="absolute left-3 top-3.5 text-white/40" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar vehículo"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#f87171]/60"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-6 text-sm text-white/60">Cargando vehículos...</div>
            ) : vehicles.length === 0 ? (
              <div className="p-6 text-sm text-white/60">No hay vehículos registrados.</div>
            ) : (
              <div className="divide-y divide-white/10">
                {vehicles.map((vehicle) => (
                  <article key={vehicle.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="rounded-xl bg-[#f87171]/10 p-3 text-[#f87171]">
                        <CarFront size={18} />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">{vehicle.marca} {vehicle.modelo}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-white/60">
                          <span className="rounded-full bg-white/5 px-2 py-1">{vehicle.placa}</span>
                          <span className="rounded-full bg-white/5 px-2 py-1">{vehicle.tipo_combustible}</span>
                          <span className="rounded-full bg-white/5 px-2 py-1">{vehicle.kilometraje} km</span>
                        </div>
                        <p className="mt-2 text-sm text-white/70">
                          {vehicle.cliente ? `${vehicle.cliente.nombre} ${vehicle.cliente.apellido}` : `Cliente #${vehicle.cliente_id}`} · {vehicle.estado}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <button type="button" onClick={() => selectVehicle(vehicle)} className="inline-flex items-center gap-2 rounded-lg border border-[#f87171]/40 bg-[#f87171]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f87171]">
                        <PencilLine size={14} /> Editar
                      </button>
                      <button type="button" onClick={() => toggleStatus(vehicle.id, vehicle.estado === 'activo' ? 'inactivo' : 'activo')} className="inline-flex items-center gap-2 rounded-lg border border-yellow-400/40 bg-yellow-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-100">
                        <ShieldCheck size={14} /> {vehicle.estado === 'activo' ? 'Desactivar' : 'Activar'}
                      </button>
                      <button type="button" onClick={() => removeVehicle(vehicle.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200">
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
                Cliente
                <select
                  required
                  value={form.cliente_id}
                  onChange={(event) => setForm({ ...form, cliente_id: event.target.value })}
                  className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                >
                  <option value="">Selecciona un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.nombre} {client.apellido}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                Placa
                <input
                  required
                  value={form.placa}
                  onChange={(event) => setForm({ ...form, placa: event.target.value })}
                  className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                  placeholder="ABC123"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                  Marca
                  <input
                    required
                    value={form.marca}
                    onChange={(event) => setForm({ ...form, marca: event.target.value })}
                    className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                  />
                </label>

                <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                  Modelo
                  <input
                    required
                    value={form.modelo}
                    onChange={(event) => setForm({ ...form, modelo: event.target.value })}
                    className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                  Año
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={form.anio}
                    onChange={(event) => setForm({ ...form, anio: event.target.value })}
                    className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                  />
                </label>

                <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                  Color
                  <input
                    value={form.color}
                    onChange={(event) => setForm({ ...form, color: event.target.value })}
                    className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                Kilometraje
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <Gauge size={15} className="text-[#f87171]" />
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.kilometraje}
                    onChange={(event) => setForm({ ...form, kilometraje: event.target.value })}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  />
                </div>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                  Combustible
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                    <Fuel size={15} className="text-[#f87171]" />
                    <select
                      value={form.tipo_combustible}
                      onChange={(event) => setForm({ ...form, tipo_combustible: event.target.value })}
                      className="w-full bg-transparent text-sm text-white outline-none"
                    >
                      {combustibleOptions.map((option) => (
                        <option key={option} value={option} className="bg-[#141414]">{option}</option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                  Estado
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                    <ShieldCheck size={15} className="text-[#f87171]" />
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
              </div>

              <button type="submit" className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#f87171] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1a0909] transition hover:bg-[#fca5a5]">
                <UserRound size={15} />
                {selectedId ? 'Guardar cambios' : 'Crear vehículo'}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </main>
  )
}

