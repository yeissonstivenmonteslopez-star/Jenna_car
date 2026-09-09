
import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, ChevronDown, Menu, ShieldCheck, Wrench, X, MapPin } from 'lucide-react'
import { Gallery } from '@/components/gallery'
import { getVehiculos, createVehiculo } from '@/features/vehiculos/services/vehiculosService'
import { getServices } from '@/features/servicios/services/serviciosService'
import { checkDisponibilidad, createCita } from '@/features/citas/services/citasService'

const services = [
  { icon: Wrench, title: 'Mantenimiento', text: 'Revisiones precisas para que tu vehículo siempre esté a punto.', backTitle: 'Diagnóstico', backText: 'Tecnología avanzada para anticiparnos a cada problema.' },
  { icon: ShieldCheck, title: 'Scanner y electricidad', text: 'Detectamos fallas electrónicas y cuidamos cada componente eléctrico de tu vehículo.', backTitle: 'Alineación y balanceo', backText: 'Mejoramos la estabilidad, el desgaste de las llantas y la precisión de tu conducción.' },
]

const formatCop = (amount?: number) => `COP $${Number(amount || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`

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

export default function Page() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [messageBooking, setMessageBooking] = useState('')
  const [vehicles, setVehicles] = useState<VehicleOption[]>([])
  const [servicesList, setServicesList] = useState<ServiceOption[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [bookingSaving, setBookingSaving] = useState(false)
  const [minBookingDate, setMinBookingDate] = useState('')
  const [showNewVehicleForm, setShowNewVehicleForm] = useState(false)
  const [flippedServices, setFlippedServices] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setMinBookingDate(new Date().toISOString().slice(0, 10))
  }, [])

  async function loadBookingOptions() {
    const token = localStorage.getItem('jenna_car_token') || ''
    if (!token) return

    try {
      const [vehiclesData, servicesData] = await Promise.all([
        getVehiculos(token).catch(() => ({ data: [] })),
        getServices().catch(() => ({ data: [] })),
      ])
      setVehicles(vehiclesData.data || [])
      setServicesList(servicesData.data || [])
      if ((vehiclesData.data || []).length > 0) {
        setSelectedVehicleId(String((vehiclesData.data || [])[0].id))
      }
      if ((servicesData.data || []).length > 0) {
        setSelectedServiceId(String((servicesData.data || [])[0].id))
      }
    } catch {
      setVehicles([])
      setServicesList([])
    }
  }

  useEffect(() => {
    if (bookingOpen) {
      loadBookingOptions()
    }
  }, [bookingOpen])

  function requestBooking() {
    const token = localStorage.getItem('jenna_car_token') || ''
    if (!token) {
      window.location.href = '/sign-in?redirect=/citas&message=Debes%20iniciar%20sesión%20para%20agendar%20una%20cita.'
      return
    }
    window.location.href = '/citas'
  }

  async function checkAvailability() {
    const fecha = (document.getElementById('fechaCita') as HTMLInputElement | null)?.value
    const hora = (document.getElementById('horaCita') as HTMLInputElement | null)?.value
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('jenna_car_token') || ''
    if (!fecha || !hora) {
      setMessageBooking('Por favor selecciona fecha y hora')
      return
    }
    if (hora > '19:00') {
      setMessageBooking('No se pueden agendar citas después de las 19:00.')
      return
    }
    if (token) {
      checkDisponibilidad({ fecha, hora }, token).then((data) => {
        setMessageBooking(data.data ? 'Horario disponible' : 'Horario no disponible')
      }).catch((error: unknown) => setMessageBooking(error instanceof Error ? error.message : 'Horario no disponible'))
    } else {
      setMessageBooking('Debes iniciar sesión')
    }
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = localStorage.getItem('jenna_car_token') || ''
    const fecha = (document.getElementById('fechaCita') as HTMLInputElement | null)?.value
    const hora = (document.getElementById('horaCita') as HTMLInputElement | null)?.value
    const motivo = (document.getElementById('motivoCita') as HTMLInputElement | null)?.value || ''

    if (!token) {
      setMessageBooking('Debes iniciar sesión para agendar una cita.')
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

      setBookingSaving(true)
      await createCita({ vehiculo_id: vehicleId, servicio_id: Number(selectedServiceId), fecha, hora, motivo }, token)

      setMessageBooking('Cita agendada correctamente.')
      setBookingOpen(false)
      window.location.href = '/profile'
    } catch (error) {
      setMessageBooking(error instanceof Error ? error.message : 'No fue posible agendar la cita.')
    } finally {
      setBookingSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
          <div className="flex items-center gap-4">
            <a href="#inicio" className="font-serif text-xl tracking-[0.18em] text-primary-foreground">JENNA <span className="text-accent">CAR</span></a>
          </div>

          <nav className="hidden items-center gap-8 text-[11px] font-medium uppercase tracking-[0.18em] text-primary-foreground/70 md:flex">
            <a href="#servicios" className="transition hover:text-primary-foreground">Servicios</a>
            <a href="#nosotros" className="transition hover:text-primary-foreground">Nosotros</a>
            <a href="#contacto" className="transition hover:text-primary-foreground">Contacto</a>
          </nav>

          <div className="flex items-center gap-3 md:gap-2">
            <button aria-label="Abrir menú" onClick={() => setMobileMenuOpen((open) => !open)} className="p-2 text-primary-foreground md:hidden">{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {mobileMenuOpen && <div className="mx-4 flex flex-col gap-5 border border-primary-foreground/10 bg-primary p-6 text-xs uppercase tracking-[0.16em] text-primary-foreground md:hidden"><a href="#servicios" onClick={() => setMobileMenuOpen(false)}>Servicios</a><a href="#nosotros" onClick={() => setMobileMenuOpen(false)}>Nosotros</a><a href="#contacto" onClick={() => setMobileMenuOpen(false)}>Contacto</a><button onClick={() => { setMobileMenuOpen(false); setBookingOpen(true) }} className="border border-primary-foreground/30 py-3 text-left px-3">Agendar cita</button></div>}
      </header>

      <section id="inicio" className="relative flex min-h-[680px] items-end overflow-hidden bg-primary pb-20 pt-40 lg:min-h-[760px] lg:pb-28">
        <img src="/jenna-car-hero.png" alt="Vehículo premium en el taller Jenna Car" className="absolute inset-0 h-full w-full object-cover opacity-75" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-primary/30" />
        <div className="relative mx-auto w-full max-w-7xl px-6 lg:px-10">
          <div className="max-w-3xl">
            <p className="mb-7 text-[10px] font-medium uppercase tracking-[0.34em] text-accent">Cuidado automotriz · Bogotá</p>
            <h1 className="max-w-2xl font-serif text-5xl leading-[0.97] tracking-[-0.035em] text-primary-foreground sm:text-7xl lg:text-8xl">Tu vehículo.<br /><em className="text-accent">Nuestra prioridad.</em></h1>
            <p className="mt-8 max-w-md text-sm leading-7 text-primary-foreground/65">Un nuevo estándar de confianza y excelencia para quienes entienden que conducir también es una forma de vivir.</p>
            <div className="mt-10 flex flex-wrap items-center gap-5"><button onClick={requestBooking} className="group ml-1 flex items-center gap-5 bg-accent px-6 py-4 text-[10px] font-semibold tracking-[0.18em] text-accent-foreground transition hover:bg-accent/90">AGENDAR CITA <ArrowUpRight size={16} className="transition group-hover:translate-x-1 group-hover:-translate-y-1" /></button><a href="#servicios" className="flex items-center gap-2 text-[10px] font-medium tracking-[0.18em] text-primary-foreground/65 transition hover:text-primary-foreground">VER SERVICIOS <ChevronDown size={14} /></a></div>
          </div>
          <div className="mt-20 flex items-center gap-12 text-primary-foreground/50"><span className="font-mono text-[10px] tracking-[0.2em]">01 / 03</span><span className="h-px w-20 bg-primary-foreground/30" /><span className="text-[10px] uppercase tracking-[0.2em]">Precisión en movimiento</span></div>
        </div>
      </section>

      <section id="servicios" className="bg-secondary px-6 py-24 lg:px-10 lg:py-32"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end"><div><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Lo que hacemos</p><h2 className="max-w-xl font-serif text-4xl leading-tight tracking-tight text-secondary-foreground sm:text-6xl">Nuestra filosofía.<br /><span className="text-muted-foreground">Cuidar cada detalle.</span></h2></div></div><div className="mt-20 grid gap-5 md:grid-cols-2">{services.map((service) => { const Icon = service.icon; const isFlipped = !!flippedServices[service.title]; return <button key={service.title} type="button" onClick={() => setFlippedServices((current) => ({ ...current, [service.title]: !current[service.title] }))} className="group relative h-[260px] cursor-pointer text-left [perspective:1200px]" aria-label={`Ver detalle de ${service.title}`}><div className={`relative h-full w-full rounded-[24px] border border-[#d7c5af] bg-[#f7f1ea] shadow-[0_12px_28px_rgba(28,21,18,0.06)] transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}><div className="absolute inset-0 flex h-full flex-col justify-between rounded-[24px] bg-[#f7f1ea] p-8 [backface-visibility:hidden]"><div><Icon size={26} strokeWidth={1.2} className="text-accent" /><h3 className="mt-14 font-serif text-2xl text-secondary-foreground">{service.title}</h3><p className="mt-4 text-sm leading-7 text-muted-foreground">{service.text}</p></div><span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary-foreground">Toca para girar <ArrowUpRight size={14} className="text-accent" /></span></div><div className="absolute inset-0 flex h-full flex-col justify-between rounded-[24px] bg-[#efe3d5] p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]"><div><p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">Detalle</p><h3 className="mt-8 font-serif text-2xl text-secondary-foreground">{service.backTitle}</h3><p className="mt-4 text-sm leading-7 text-secondary-foreground/75">{service.backText}</p></div><span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary-foreground">Volver <ArrowUpRight size={14} className="text-accent" /></span></div></div></button> })}</div></div></section>


      <section id="nosotros" className="bg-primary px-6 py-24 text-primary-foreground lg:px-10 lg:py-32"><div className="mx-auto flex max-w-7xl flex-col gap-12 lg:flex-row lg:items-end lg:justify-between"><div><p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Jenna Car Studio</p><h2 className="max-w-2xl font-serif text-4xl leading-tight sm:text-6xl">La excelencia no se<br /><em className="text-accent">improvisa.</em></h2></div><div className="max-w-sm"><p className="text-sm leading-7 text-primary-foreground/60">Un equipo de especialistas, un espacio pensado al milímetro y una obsesión compartida: que cada visita a Jenna Car se sienta diferente.</p><div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3 rounded-xl border border-primary-foreground/15 bg-[#201d1b] p-2 shadow-[0_10px_25px_rgba(0,0,0,0.18)]"><img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://wa.me/573134758191" alt="QR de WhatsApp Jenna Car" className="h-16 w-16 rounded-lg bg-white p-2" /><div className="text-left"><p className="text-[10px] uppercase tracking-[0.2em] text-accent">WhatsApp</p><p className="mt-2 text-xs text-primary-foreground/65">Escanea para contactar</p></div></div></div></div></div></section>

      <Gallery />

      <section id="contacto" className="bg-primary px-6 py-24 text-primary-foreground lg:px-10 lg:py-32"><div className="mx-auto max-w-7xl"><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Encuéntranos</p><div className="grid gap-10 lg:grid-cols-2 lg:gap-20"><div><h2 className="font-serif text-5xl sm:text-6xl">Tu próximo<br /><em className="text-accent">kilómetro</em> empieza aquí.</h2><div className="mt-12 grid gap-6 text-sm"><div className="flex gap-4"><MapPin size={18} className="mt-1 text-accent" /><div><p className="font-medium">Dirección del taller</p><p className="mt-1 text-primary-foreground/55">Cra. 48a #16-835, Bogotá, Colombia</p></div></div><div className="grid gap-1 pl-8 text-primary-foreground/55"><p>+57 313 475 81 91</p><p>+57 312 366 66 58</p><p>jenacarservices@gmail.com</p><p>Lunes — Viernes · 08:30 — 19:00</p></div></div><div className="mt-10"><a href="https://www.google.com/maps/search/?api=1&query=4.750220695224997,-74.05182472460774" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 border border-primary-foreground/25 px-5 py-4 text-[10px] font-semibold tracking-[0.18em] transition hover:bg-primary-foreground hover:text-primary">ABRIR EN GOOGLE MAPS <ArrowUpRight size={15} className="text-accent" /></a></div></div><div className="min-h-[360px] border border-primary-foreground/15 bg-[#282522] p-3"><iframe title="Ubicación de Jenna Car" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3976.1140266437205!2d-74.05182472460774!3d4.750220695224997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f859ec7a99cc9%3A0x8aa2829d62bbf48c!2sCra.%2048a%20%2316835%2C%20Bogot%C3%A1!5e0!3m2!1ses!2sco!4v1788388015889!5m2!1ses!2sco" className="h-full min-h-[330px] w-full grayscale opacity-80" loading="lazy" /></div></div></div></section>

      <footer className="bg-secondary px-6 py-12 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"><div><div className="font-serif text-xl tracking-[0.18em] text-secondary-foreground">JENNA <span className="text-accent">CAR</span></div><p className="mt-4 text-xs text-muted-foreground">Bogotá, Colombia</p></div><div className="text-left sm:text-right"><p className="text-xs text-muted-foreground">+57 313 475 81 91 · +57 312 366 66 58</p><p className="mt-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">© 2026 Jenna Car Studio</p></div></div></footer>

      {bookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/80 p-5 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="w-full max-w-md bg-secondary p-8 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent">Jenna Car</p>
                <h2 className="mt-3 font-serif text-3xl text-secondary-foreground">Agendar una cita</h2>
              </div>
              <button aria-label="Cerrar" onClick={() => setBookingOpen(false)} className="text-muted-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={submitBooking} className="mt-8 grid gap-4">
              {vehicles.length > 0 ? (
                <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary-foreground/60">
                  Vehículo
                  <select
                    value={showNewVehicleForm ? 'new' : selectedVehicleId}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      const isNewVehicle = nextValue === 'new'
                      setShowNewVehicleForm(isNewVehicle)
                      setSelectedVehicleId(isNewVehicle ? 'new' : nextValue)
                    }}
                    className="border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent"
                  >
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>{vehicle.marca} {vehicle.modelo} · {vehicle.placa}</option>
                    ))}
                    <option value="new">Registrar otro vehículo</option>
                  </select>
                </label>
              ) : null}

              {(showNewVehicleForm || vehicles.length === 0) && (
                <div className="grid gap-3 rounded border border-dashed border-border p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary-foreground/60">Nuevo vehículo</p>
                  <input
                    name="placa"
                    required
                    placeholder="ABC123"
                    pattern="[A-Z]{3}[0-9]{3}"
                    title="La placa debe tener 3 letras y 3 números"
                    onChange={(event) => event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}
                    className="border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent"
                  />
                  <input name="marca" required placeholder="Marca" className="border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent" />
                  <input name="modelo" required placeholder="Modelo" className="border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent" />
                  <div className="grid grid-cols-2 gap-3">
                    <input name="anio" type="number" placeholder="Año" className="border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent" />
                    <input name="color" placeholder="Color" className="border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input name="kilometraje" type="number" min="0" placeholder="Kilometraje" className="border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent" />
                    <select name="tipo_combustible" className="border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent">
                      <option value="gasolina">Gasolina</option>
                      <option value="diesel">Diesel</option>
                      <option value="hibrido">Híbrido</option>
                      <option value="electrico">Eléctrico</option>
                      <option value="gas">Gas</option>
                    </select>
                  </div>
                </div>
              )}
              <select value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)} className="border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent">
                <option value="">Selecciona un servicio</option>
                {servicesList.map((service) => (
                  <option key={service.id} value={service.id}>{service.name} · {formatCop(service.price)}</option>
                ))}
              </select>
              <input required type="date" id="fechaCita" min={minBookingDate || undefined} className="border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent" />
              <label className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-primary-foreground/60">Hora:</label>
              <input required type="time" id="horaCita" min="08:00" max="19:00" step={1800} className="border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent" />
              <input id="motivoCita" placeholder="Motivo / observaciones (opcional)" className="border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent" />
              {messageBooking && <p className="text-xs text-accent">{messageBooking}</p>}
              <button type="button" onClick={checkAvailability} className="w-full border border-border bg-field px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-secondary-foreground transition hover:bg-accent hover:text-accent-foreground">Ver disponibilidad</button>
              <button disabled={bookingSaving} className="flex items-center justify-center gap-3 bg-accent px-5 py-4 text-[10px] font-semibold tracking-[0.18em] text-accent-foreground disabled:opacity-60">{bookingSaving ? 'AGENDANDO…' : 'SOLICITAR CITA'} <CalendarDays size={15} /></button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
