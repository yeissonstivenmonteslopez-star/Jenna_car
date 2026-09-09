
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, CalendarDays, CarFront, CheckCircle2, Clock3, ShieldCheck, Sparkles, Wrench } from 'lucide-react'
import { getVehiculos, createVehiculo } from '@/features/vehiculos/services/vehiculosService'
import { getServices } from '@/features/servicios/services/serviciosService'
import { createCita } from '@/features/citas/services/citasService'

const serviceBadges = {
  mantenimiento: Wrench,
  estetica: Sparkles,
  diagnostico: ShieldCheck,
}

function getServiceBadge(serviceName: string) {
  const normalized = serviceName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (normalized.includes('mantenimiento')) return serviceBadges.mantenimiento
  if (normalized.includes('estetica')) return serviceBadges.estetica
  if (normalized.includes('diagnostico')) return serviceBadges.diagnostico
  return Wrench
}

type VehicleOption = {
  id: number
  placa: string
  marca: string
  modelo: string
  anio?: number | null
  color?: string | null
  tipo_combustible?: string
}

type ServiceOption = {
  id: number
  name: string
  description?: string | null
  price?: number
  duration_minutes?: number
}

export default function CitasPage() {
  const [loading, setLoading] = useState(true)
  const [vehicles, setVehicles] = useState<VehicleOption[]>([])
  const [servicesList, setServicesList] = useState<ServiceOption[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [messageBooking, setMessageBooking] = useState('')
  const [bookingSaving, setBookingSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showNewVehicleForm, setShowNewVehicleForm] = useState(false)

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => String(vehicle.id) === selectedVehicleId) || null,
    [vehicles, selectedVehicleId],
  )

  const selectedService = useMemo(
    () => servicesList.find((service) => String(service.id) === selectedServiceId) || null,
    [servicesList, selectedServiceId],
  )

  useEffect(() => {
    const token = localStorage.getItem('jenna_car_token') || ''
    if (!token) {
      window.location.href = '/sign-in?redirect=/citas'
      return
    }

    async function loadBookingOptions() {
      try {
        const [vehiclesData, servicesData] = await Promise.all([
          getVehiculos(token).catch(() => ({ data: [] })),
          getServices().catch(() => ({ data: [] })),
        ])

        const vehicleList = vehiclesData.data || []
        const serviceList = servicesData.data || []

        setVehicles(vehicleList)
        setServicesList(serviceList)

        if (vehicleList.length > 0) setSelectedVehicleId(String(vehicleList[0].id))
        if (serviceList.length > 0) setSelectedServiceId(String(serviceList[0].id))
      } catch {
        setVehicles([])
        setServicesList([])
      } finally {
        setLoading(false)
      }
    }

    loadBookingOptions()
  }, [])

  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = localStorage.getItem('jenna_car_token') || ''
    const fecha = (document.getElementById('fechaCita') as HTMLInputElement | null)?.value
    const hora = (document.getElementById('horaCita') as HTMLInputElement | null)?.value
    const motivo = (document.getElementById('motivoCita') as HTMLInputElement | null)?.value || ''

    if (!token) {
      window.location.href = '/sign-in?redirect=/citas'
      return
    }

    if (!fecha || !hora) {
      setMessageBooking('Selecciona fecha y hora para continuar.')
      return
    }

    if (hora > '19:00') {
      setMessageBooking('No se pueden agendar citas después de las 19:00.')
      return
    }

    if (!selectedServiceId) {
      setMessageBooking('Selecciona un servicio para continuar.')
      return
    }

    try {
      setBookingSaving(true)
      setMessageBooking('')

      let vehicleId = Number(selectedVehicleId)
      const isRegisteringNewVehicle = showNewVehicleForm || selectedVehicleId === 'new'

      if (!vehicleId || isRegisteringNewVehicle) {
        const form = new FormData(event.currentTarget)
        const newVehicle = {
          placa: String(form.get('placa') || '').trim(),
          marca: String(form.get('marca') || '').trim(),
          modelo: String(form.get('modelo') || '').trim(),
          anio: Number(form.get('anio') || 0) || null,
          color: String(form.get('color') || '').trim() || null,
          tipo_combustible: String(form.get('tipo_combustible') || 'gasolina'),
          kilometraje: Number(form.get('kilometraje') || 0) || 0,
        }

        const normalizedPlate = newVehicle.placa.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
        newVehicle.placa = normalizedPlate

        if (!/^[A-Z]{3}[0-9]{3}$/.test(newVehicle.placa) || !newVehicle.marca || !newVehicle.modelo) {
          setMessageBooking('La placa debe tener 3 letras y 3 números. También indica marca y modelo.')
          return
        }

        const vehicleData = await createVehiculo(newVehicle as Record<string, unknown>, token)
        vehicleId = Number(vehicleData.data?.id || 0)
      }

      await createCita({ vehiculo_id: vehicleId, servicio_id: Number(selectedServiceId), fecha, hora, motivo }, token)

      setSuccess(true)
      setMessageBooking('Cita agendada correctamente.')
      window.setTimeout(() => {
        window.location.href = '/profile'
      }, 1200)
    } catch (error) {
      setMessageBooking(error instanceof Error ? error.message : 'No fue posible agendar la cita.')
    } finally {
      setBookingSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-primary px-6 py-12 text-primary-foreground">
        <div className="mx-auto max-w-2xl rounded-3xl border border-primary-foreground/10 bg-secondary/80 p-10 text-center text-sm text-primary-foreground/70">
          Cargando tu agenda…
        </div>
      </main>
    )
  }

  return (
    <main
      className="min-h-screen bg-[#0a0a0a] px-4 py-10 text-white sm:px-6 lg:px-10"
      style={{ backgroundImage: 'radial-gradient(circle at top, rgba(239, 68, 68, 0.18), transparent 30%), linear-gradient(180deg, #0a0a0a 0%, #111111 100%)' }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <a href="/" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/70 transition hover:text-white">
            <ArrowLeft size={14} /> Volver al inicio
          </a>
          <div className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-red-300">
            Jenna Car Studio
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_0.85fr]">
          <section className="rounded-[28px] border border-red-500/20 bg-[#141414] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-red-400">Agenda</p>
                <h1 className="mt-3 font-serif text-4xl text-white md:text-5xl">Agendar una cita</h1>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
                <CalendarDays size={20} />
              </div>
            </div>

            <form onSubmit={handleBookingSubmit} className="grid gap-6">
              <div className="grid gap-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Vehículo</p>
                {vehicles.length > 0 ? (
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">
                    <span>Selecciona tu coche</span>
                    <select
                      value={showNewVehicleForm ? 'new' : selectedVehicleId}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        const isNewVehicle = nextValue === 'new'
                        setShowNewVehicleForm(isNewVehicle)
                        setSelectedVehicleId(isNewVehicle ? 'new' : nextValue)
                      }}
                      className="rounded-2xl border border-red-500/30 bg-[#1d1d1d] px-4 py-3.5 text-sm text-white outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/30"
                    >
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id} className="bg-[#1d1d1d] text-white">
                          {vehicle.marca} {vehicle.modelo} · {vehicle.placa}
                        </option>
                      ))}
                      <option value="new" className="bg-[#1d1d1d] text-white">Registrar otro vehículo</option>
                    </select>
                  </label>
                ) : null}

                {(showNewVehicleForm || vehicles.length === 0) && (
                  <div className="grid gap-3 rounded-2xl border border-dashed border-red-500/30 bg-[#171717] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">Nuevo vehículo</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input name="placa" required placeholder="Placa" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-red-400" />
                      <input name="marca" required placeholder="Marca" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-red-400" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input name="modelo" required placeholder="Modelo" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-red-400" />
                      <input name="anio" type="number" placeholder="Año" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-red-400" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input name="color" placeholder="Color" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-red-400" />
                      <input name="kilometraje" type="number" min="0" placeholder="Kilometraje" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-red-400" />
                    </div>
                    <select name="tipo_combustible" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white outline-none transition focus:border-red-400">
                      <option value="gasolina" className="bg-[#0f0f0f] text-white">Gasolina</option>
                      <option value="diesel" className="bg-[#0f0f0f] text-white">Diesel</option>
                      <option value="hibrido" className="bg-[#0f0f0f] text-white">Híbrido</option>
                      <option value="electrico" className="bg-[#0f0f0f] text-white">Eléctrico</option>
                      <option value="gas" className="bg-[#0f0f0f] text-white">Gas</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Servicio</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {servicesList.map((service) => {
                    const Icon = getServiceBadge(service.name)
                    const isSelected = String(service.id) === selectedServiceId
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setSelectedServiceId(String(service.id))}
                        className={`rounded-2xl border p-4 text-left transition ${isSelected ? 'border-red-400 bg-red-500/10 text-white shadow-[0_0_0_1px_rgba(239,68,68,0.2)]' : 'border-white/10 bg-[#1a1a1a] text-white/75 hover:border-red-400/40'}`}
                      >
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                          <Icon size={18} />
                        </div>
                        <p className="text-sm font-medium text-white">{service.name}</p>
                        <p className="mt-2 text-[11px] text-white/60">{service.duration_minutes ? `${service.duration_minutes} min` : 'Personalizado'}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/70">
                  <span className="mb-1">Fecha</span>
                  <div className="relative">
                    <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-red-300" />
                    <input
                      required
                      type="date"
                      id="fechaCita"
                      min={new Date().toISOString().slice(0, 10)}
                      style={{ colorScheme: 'dark' }}
                      className="w-full rounded-xl border border-red-500/30 bg-[#0f0f0f] pl-10 pr-4 py-3 text-sm text-white outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/25"
                    />
                  </div>
                </label>
                <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/70">
                  <span className="mb-1">Hora</span>
                  <div className="relative">
                    <Clock3 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-red-300" />
                    <input
                      required
                      type="time"
                      id="horaCita"
                      min="08:00"
                      max="19:00"
                      step={1800}
                      style={{ colorScheme: 'dark' }}
                      className="w-full rounded-xl border border-red-500/30 bg-[#0f0f0f] pl-10 pr-4 py-3 text-sm text-white outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/25"
                    />
                  </div>
                </label>
              </div>

              <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">
                Motivo / observaciones
                <input id="motivoCita" placeholder="Opcional" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-red-400" />
              </label>

              {messageBooking && (
                <p className={`rounded-xl border px-4 py-3 text-sm ${success ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}>
                  {success ? <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} /> {messageBooking}</span> : messageBooking}
                </p>
              )}

              <button
                type="submit"
                disabled={bookingSaving}
                className="mt-2 flex items-center justify-center gap-3 rounded-2xl bg-red-600 px-5 py-4 text-[10px] font-semibold tracking-[0.18em] text-white shadow-[0_14px_35px_rgba(239,68,68,0.35)] transition hover:bg-red-500 disabled:opacity-60"
              >
                {bookingSaving ? 'AGENDANDO…' : 'SOLICITAR CITA'} <CalendarDays size={15} />
              </button>
            </form>
          </section>

          <aside className="rounded-[28px] border border-red-500/20 bg-[#141414] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
                <CarFront size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Resumen</p>
                <h2 className="font-serif text-2xl text-white">Tu cita</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-red-500/20 bg-[#1b1b1b] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Vehículo</p>
                <p className="mt-2 text-base font-medium text-white">
                  {selectedVehicle ? `${selectedVehicle.marca} ${selectedVehicle.modelo}` : 'Añadir vehículo'}
                </p>
                <p className="mt-1 text-sm text-white/60">{selectedVehicle ? selectedVehicle.placa : 'Pendiente'}</p>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-[#1b1b1b] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Servicio</p>
                <p className="mt-2 text-base font-medium text-white">
                  {selectedService ? selectedService.name : 'Sin seleccionar'}
                </p>
                <p className="mt-1 text-sm text-white/60">
                  {selectedService?.duration_minutes ? `${selectedService.duration_minutes} minutos` : 'Personalizado'}
                </p>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-[#1b1b1b] p-4">
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/55">
                  <Clock3 size={12} /> Disponibilidad
                </p>
                <p className="mt-2 text-sm text-white/75">Revisamos la disponibilidad real al enviar la solicitud.</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-red-500/10 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-red-300">Proceso</p>
              <ol className="mt-3 space-y-2 text-sm text-white/75">
                <li>1. Selecciona tu vehículo.</li>
                <li>2. Elige el servicio.</li>
                <li>3. Confirma fecha y hora.</li>
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
