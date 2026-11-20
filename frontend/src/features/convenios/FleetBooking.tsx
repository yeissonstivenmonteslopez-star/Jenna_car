import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, getStoredToken } from '@/services/apiClient'
import NotchCalendarCard from '@/components/ui/NotchCalendarCard'
import AppointmentTimePicker from '@/features/citas/pages/AppointmentTimePicker'
import FleetInbox from './FleetInbox'
import BookingVehicleIdentity from '@/features/citas/pages/BookingVehicleIdentity'
import { fleetKey, fleetRequest, type Fleet, type Vehicle } from './fleetApi'

const field = 'rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-3 text-white focus:border-red-500'
const action = 'rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-600 disabled:opacity-50'

function sessionToken(): string {
  try { return JSON.parse(localStorage.getItem(fleetKey) || 'null')?.token || getStoredToken() }
  catch { return getStoredToken() }
}

export default function FleetBooking() {
  const navigate = useNavigate()
  const [token] = useState(sessionToken)
  const [fleet, setFleet] = useState<Fleet | null>(null)
  const [selected, select] = useState('')
  const [date, setDate] = useState('')
  const [hour, setHour] = useState('')
  const [service, setService] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [slotError, setSlotError] = useState('')
  const [checking, setChecking] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setHour('')
    setSlots([])
    setSlotError('')
    if (!date || !selected || !service) return
    setChecking(true)
    const query = new URLSearchParams({ fecha: date, vehiculo_id: selected, servicio_id: service })
    fleetRequest<string[]>('convenios/horarios?' + query, token)
      .then(data => { if (active) setSlots(data) })
      .catch(() => { if (active) setSlotError('No se pudieron consultar los horarios.') })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [date, selected, service, token, retry])
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    let active = true
    if (!token) { navigate('/sign-in', { replace: true }); return }
    fleetRequest<Fleet>('convenios/flota', token).then(data => {
      if (active) { setFleet(data); setService(String(data.servicios[0]?.id || '')); setAdding(!data.vehiculos.length); select(String(data.vehiculos[0]?.id || '')) }
    }).catch(error => {
      if (!active) return
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        localStorage.removeItem(fleetKey)
        navigate('/sign-in', { replace: true })
      } else setMessage('No se pudo cargar la flota. Vuelve a intentarlo.')
    })
    return () => { active = false }
  }, [token, navigate])

  async function submit(event: FormEvent<HTMLFormElement>, newVehicle: boolean) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form))
    setBusy(true)
    setMessage('')
    try {
      if (newVehicle) {
        const vehicle = await fleetRequest<Vehicle>('convenios/vehiculos', token, payload)
        setFleet(current => current && ({ ...current, vehiculos: [...current.vehiculos, vehicle] }))
        select(String(vehicle.id))
        setAdding(false)
        setMessage('Móvil registrado. Ya puedes agendar la cita.')
      } else {
        const result = await fleetRequest<{data: {id: number}}>('citas', token, payload)
        form.reset()
        setDate('')
        setHour('')
        setMessage('Cita prioritaria #' + result.data.id + ' registrada. La facturación será a crédito.')
      }
    } catch (e) {
      if (!newVehicle && e instanceof ApiError && e.status === 409) setRetry(n => n + 1)
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem(fleetKey)
        navigate('/sign-in', { replace: true })
      } else setMessage(e instanceof TypeError ? 'No se pudo conectar con el taller.' : (e as Error).message)
    } finally { setBusy(false) }
  }

  return <main className="fleet-agenda min-h-screen bg-slate-950 bg-[linear-gradient(120deg,rgba(3,18,41,.94),rgba(4,29,47,.80),rgba(7,15,25,.96)),url(/jenna-car-hero.png)] bg-cover bg-center bg-fixed px-4 py-8 text-white md:py-14">
    <div className="mx-auto grid max-w-3xl gap-6 rounded-3xl border border-cyan-200/20 bg-slate-950/80 p-5 shadow-2xl backdrop-blur-md md:p-10">
      <header className="flex items-center justify-between gap-4"><h1 className="text-3xl font-semibold">Agenda de flota</h1>
        <button className="underline" onClick={() => { localStorage.removeItem(fleetKey); navigate('/sign-in') }}>Salir del convenio</button></header>
      {message && <p role="status" className="rounded border border-neutral-600 p-3">{message}</p>}
      {fleet ? <>
        <FleetInbox token={token} />
        <section className="overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900">
          <div className="bg-white px-6 py-4">
            <img src="/brand/emermedica.png" alt="Emermédica" className="h-auto w-full max-w-64" />
          </div>
          <div className="p-5">
            <h2 className="text-xl font-semibold">Emermédica, gracias por confiar en nosotros.</h2>
            <p className="mt-2 text-neutral-300">En Jenna Car cuidamos sus ambulancias para que ustedes puedan seguir cuidando a las personas.</p>
          </div>
        </section>
        <div><strong className="rounded bg-red-700 px-3 py-1 text-sm">Atención Prioritaria - Convenio</strong>
          <h2 className="mt-4 text-2xl">NIT {fleet.empresa.nit}</h2>
          <p className="text-neutral-300">Crédito a {fleet.empresa.dias_credito} días · Descuento del {fleet.empresa.porcentaje_descuento}%</p></div>
        {adding ? <form onSubmit={e => submit(e, true)} className="grid gap-4">
          <h3 className="text-xl">Registrar vehículo de flota</h3>
          <input name="numero_interno" aria-label="Número interno" required maxLength={30} placeholder="Número interno (Móvil 04)" className={field} />
          <label className="grid gap-1">Tipo de vehículo<select name="tipo_vehiculo" required defaultValue="" className={field}><option value="" disabled>Selecciona el tipo</option><option>Ambulancia</option><option>Otro tipo de servicio</option></select></label>
          <BookingVehicleIdentity className={field} />
          <button disabled={busy} className={action}>Guardar móvil</button>
          {!!fleet.vehiculos.length && <button type="button" onClick={() => setAdding(false)}>Volver a la cita</button>}
        </form> : <form onSubmit={e => submit(e, false)} className="grid gap-4">
          <label className="grid gap-1">Vehículo de flota<select name="vehiculo_id" value={selected} onChange={e => select(e.target.value)} required className={field}>
            {fleet.vehiculos.map(v => <option key={v.id} value={v.id}>{v.numero_interno} · {v.placa} · {v.marca} {v.modelo}{v.tipo_vehiculo && ' · ' + v.tipo_vehiculo}</option>)}</select></label>
          <button type="button" onClick={() => setAdding(true)} className="justify-self-start underline">Registrar otro móvil</button>
          <label className="grid gap-1">Servicio<select required name="servicio_id" value={service} onChange={e => setService(e.target.value)} className={field}>
            {fleet.servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>
          <NotchCalendarCard value={date} onSelectDate={setDate} disablePast defaultExpanded disabled={busy} />
          <AppointmentTimePicker date={date} value={hour} available={slots} loading={checking} error={slotError}
            onChange={setHour} onRetry={() => setRetry(n => n + 1)} />
          <input type="hidden" name="fecha" value={date} />
          <input type="hidden" name="hora" value={hour} />
          <input name="nombre_conductor_entrega" required maxLength={100} placeholder="Nombre del conductor" aria-label="Nombre del conductor" className={field} />
          <input type="tel" name="telefono_conductor" required maxLength={20} placeholder="Teléfono del conductor" aria-label="Teléfono del conductor" className={field} />
          <textarea name="motivo" required maxLength={2000} placeholder="Motivo del ingreso urgente" aria-label="Motivo del ingreso urgente" className={field} />
          <input name="codigo_autorizacion" maxLength={50} placeholder="Código de autorización (opcional)" aria-label="Código de autorización" className={field} />
          <button className={action} disabled={busy || checking || !date || !slots.includes(hour)}>Confirmar cita prioritaria</button>
        </form>}
      </> : !message && <p>Cargando flota…</p>}
    </div>
  </main>
}
