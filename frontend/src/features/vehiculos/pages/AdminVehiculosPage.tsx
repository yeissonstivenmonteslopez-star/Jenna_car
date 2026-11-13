/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from 'react'
import VehicleEditor from './VehicleEditor'
import type { Vehicle, ClientOption, VehicleForm } from './vehicleTypes'
import type { FormEvent } from 'react'
import {
  Car,
  CarFront,
  CheckCircle2,
  Gauge,
  Fuel,
  PencilLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import {
  getAdminVehiculos,
  createAdminVehiculo,
  updateAdminVehiculo,
  deleteAdminVehiculo,
} from '@/features/vehiculos/services/vehiculosService'
import { getAdminUsuarios } from '@/features/usuarios/services/usuariosService'

function getStatusBadge(estado: string) {
  switch (estado) {
    case 'activo':
      return {
        label: 'Activo',
        className: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30',
      }
    case 'en_mantenimiento':
      return {
        label: 'En mantenimiento',
        className: 'bg-amber-950/40 text-amber-300 border-amber-500/30',
      }
    case 'inactivo':
      return {
        label: 'Inactivo',
        className: 'bg-red-950/40 text-red-300 border-red-500/30',
      }
    default:
      return {
        label: estado,
        className: 'bg-white/5 text-white/60 border-white/10',
      }
  }
}

export default function AdminVehiculosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [token] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('error')

  const [form, setForm] = useState<VehicleForm>({
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
    total: vehicles.length,
    activos: vehicles.filter((v) => v.estado === 'activo').length,
    mantenimiento: vehicles.filter((v) => v.estado === 'en_mantenimiento').length,
    inactivos: vehicles.filter((v) => v.estado === 'inactivo').length,
  }), [vehicles])

  const loadClients = useCallback(async (authToken: string) => {
    try {
      const data = await getAdminUsuarios(authToken)
      if (data?.data && Array.isArray(data.data)) {
        setClients(
          data.data.map((item: any) => ({
            id: item.id,
            nombre: item.nombre,
            apellido: item.apellido,
            email: item.email,
          }))
        )
      }
    } catch (err: any) {
      console.error('Error al cargar clientes:', err)
    }
  }, [])

  const loadVehicles = useCallback(async (authToken: string) => {
    try {
      const data = await getAdminVehiculos({ q: search }, authToken)
      setVehicles(data.data || [])
    } catch (err: any) {
      setMessage(err.message || 'No fue posible cargar los vehículos.')
      setMessageType('error')
    }
  }, [search])

  useEffect(() => {
    if (!token) {
      window.location.href = '/sign-in'
      return
    }
    loadClients(token)
  }, [token, loadClients])

  useEffect(() => {
    if (!token) return
    let active = true
    setLoading(true)
    getAdminVehiculos({ q: search }, token)
      .then((data) => {
        if (active) setVehicles(data.data || [])
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : 'No fue posible cargar los vehículos.')
          setMessageType('error')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    if (!form.cliente_id) {
      setMessage('Debes seleccionar un cliente propietario para el vehículo.')
      setMessageType('error')
      return
    }

    const placaLimpia = form.placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!/^[A-Z]{3}[0-9]{3}$/.test(placaLimpia)) {
      setMessage('La placa debe tener exactamente 3 letras y 3 números (por ejemplo: ABC123).')
      setMessageType('error')
      return
    }

    if (!form.marca.trim()) {
      setMessage('La marca del vehículo es obligatoria.')
      setMessageType('error')
      return
    }

    if (!form.modelo.trim()) {
      setMessage('El modelo del vehículo es obligatorio.')
      setMessageType('error')
      return
    }

    const payload = {
      cliente_id: Number(form.cliente_id),
      placa: placaLimpia,
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      anio: form.anio ? Number(form.anio) : null,
      color: form.color ? form.color.trim() : null,
      kilometraje: Number(form.kilometraje || 0),
      tipo_combustible: form.tipo_combustible,
      estado: form.estado,
    }

    try {
      if (selectedId) {
        await updateAdminVehiculo(selectedId, payload, token)
      } else {
        await createAdminVehiculo(payload, token)
      }
    } catch (err: any) {
      setMessage(err.message || 'No fue posible guardar el vehículo.')
      setMessageType('error')
      return
    }

    setMessage(selectedId ? 'Vehículo actualizado correctamente.' : 'Vehículo registrado correctamente.')
    setMessageType('success')
    resetForm()
    await loadVehicles(token)
  }

  async function removeVehicle(vehicleId: number) {
    const confirmed = window.confirm(
      '¿Deseas eliminar este vehículo? Si tiene órdenes o citas vinculadas, se desactivará en su lugar.'
    )
    if (!confirmed) return

    try {
      const data = await deleteAdminVehiculo(vehicleId, token)
      setMessage((data as any).message || 'Vehículo actualizado.')
      setMessageType('success')
    } catch (err: any) {
      setMessage(err.message || 'No fue posible eliminar el vehículo.')
      setMessageType('error')
      return
    }
    resetForm()
    await loadVehicles(token)
  }

  async function toggleStatus(vehicleId: number, nextState: string) {
    try {
      const data = await updateAdminVehiculo(vehicleId, { estado: nextState }, token)
      setMessage((data as any).message || 'Estado del vehículo actualizado.')
      setMessageType('success')
    } catch (err: any) {
      setMessage(err.message || 'No fue posible cambiar el estado del vehículo.')
      setMessageType('error')
      return
    }
    await loadVehicles(token)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 py-8 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-600/15 text-red-500 border border-red-500/25">
                <CarFront size={14} />
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400">
                Flota e Inventario
              </p>
            </div>
            <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight text-white md:text-5xl">
              Vehículos
            </h1>
            <p className="mt-1 text-xs text-white/50">
              Gestiona los automóviles registrados, propietarios y estados de servicio.
            </p>
          </div>
        </header>

        {/* Feedback Message */}
        {message && (
          <div
            role="alert"
            className={`mb-6 flex items-center justify-between gap-3 rounded-2xl border p-4 text-sm font-medium ${
              messageType === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                : 'border-red-500/40 bg-red-950/40 text-red-300'
            }`}
          >
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage('')}
              className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white transition"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Total Registrados</p>
              <Car size={16} className="text-white/40" />
            </div>
            <p className="mt-4 font-serif text-3xl font-bold text-white tabular-nums">{summary.total}</p>
            <p className="mt-1 text-[11px] text-white/40">Vehículos en el taller</p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Activos</p>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <p className="mt-4 font-serif text-3xl font-bold text-white tabular-nums">{summary.activos}</p>
            <p className="mt-1 text-[11px] text-emerald-300/60">Disponibles / al día</p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Mantenimiento</p>
              <Wrench size={16} className="text-amber-400" />
            </div>
            <p className="mt-4 font-serif text-3xl font-bold text-white tabular-nums">{summary.mantenimiento}</p>
            <p className="mt-1 text-[11px] text-amber-300/60">En taller actualmente</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Inactivos</p>
              <ShieldAlert size={16} className="text-white/40" />
            </div>
            <p className="mt-4 font-serif text-3xl font-bold text-white tabular-nums">{summary.inactivos}</p>
            <p className="mt-1 text-[11px] text-white/40">Deshabilitados</p>
          </div>
        </div>

        {/* Main Content Layout: Grid with Inventory & Form */}
        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          
          {/* Inventory Section */}
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-2xl shadow-black/50">
            {/* Table / List Header */}
            <div className="flex flex-col gap-4 border-b border-white/10 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/15 text-red-500 border border-red-500/20">
                  <CarFront size={18} />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-medium text-white">Inventario de Autos</h2>
                  <p className="text-[11px] text-white/45">Filtra y administra cada vehículo registrado</p>
                </div>
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por placa, marca..."
                  className="w-full rounded-xl border border-white/15 bg-[#181818] py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-white/40 outline-none transition focus:border-red-500"
                />
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="p-12 text-center text-sm text-white/50">Cargando vehículos registrados...</div>
            ) : vehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/30">
                  <CarFront size={28} />
                </div>
                <h3 className="text-base font-medium text-white/80">No hay vehículos registrados</h3>
                <p className="mt-1 max-w-sm text-xs text-white/45">
                  Utiliza el formulario de la derecha para registrar el primer vehículo en el sistema.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.08]">
                {vehicles.map((vehicle) => {
                  const status = getStatusBadge(vehicle.estado)
                  return (
                    <article
                      key={vehicle.id}
                      className="flex flex-col gap-4 p-5 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-red-400">
                          <CarFront size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md border border-red-500/30 bg-red-950/30 px-2 py-0.5 text-xs font-mono font-bold tracking-wider text-red-300">
                              {vehicle.placa}
                            </span>
                            <h3 className="truncate font-semibold text-white">
                              {vehicle.marca} {vehicle.modelo} {vehicle.anio ? `(${vehicle.anio})` : ''}
                            </h3>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                            <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-[11px]">
                              <Fuel size={12} className="text-white/40" />
                              <span className="capitalize">{vehicle.tipo_combustible}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-[11px]">
                              <Gauge size={12} className="text-white/40" />
                              {Number(vehicle.kilometraje || 0).toLocaleString('es-CO')} km
                            </span>
                            {vehicle.color && (
                              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px]">
                                Color: {vehicle.color}
                              </span>
                            )}
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>

                          <p className="mt-2 text-xs text-white/50">
                            Propietario:{' '}
                            <strong className="text-white/80">
                              {vehicle.cliente
                                ? `${vehicle.cliente.nombre} ${vehicle.cliente.apellido} (${vehicle.cliente.email})`
                                : `Cliente #${vehicle.cliente_id}`}
                            </strong>
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                        <button
                          type="button"
                          onClick={() => selectVehicle(vehicle)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:border-white/30 hover:bg-white/10 hover:text-white transition"
                        >
                          <PencilLine size={13} /> Editar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleStatus(vehicle.id, vehicle.estado === 'activo' ? 'inactivo' : 'activo')
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${
                            vehicle.estado === 'activo'
                              ? 'border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40'
                              : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40'
                          }`}
                        >
                          <ShieldCheck size={13} />
                          {vehicle.estado === 'activo' ? 'Desactivar' : 'Activar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => removeVehicle(vehicle.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-950/20 px-3 py-1.5 text-[11px] font-semibold text-red-300 hover:border-red-500/40 hover:bg-red-950/40 transition"
                        >
                          <Trash2 size={13} /> Eliminar
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {/* Vehicle Creation / Editing Panel */}
          <VehicleEditor
            form={form}
            setForm={setForm}
            selectedId={selectedId}
            clients={clients}
            resetForm={resetForm}
            onSubmit={submit}
          />
        </div>
      </div>
    </main>
  )
}
