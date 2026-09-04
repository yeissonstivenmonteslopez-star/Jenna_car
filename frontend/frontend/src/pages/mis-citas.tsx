
import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CarFront, Clock3, Wrench } from 'lucide-react'
import { getApiUrl } from '@/lib/config'

const apiUrl = getApiUrl('')

type Cita = {
  id: number
  fecha: string
  hora: string
  estado: string
  motivo?: string
  observaciones?: string
  vehiculo: {
    marca: string
    modelo: string
    placa: string
  }
  servicio: {
    name: string
  }
}

export default function MisCitasPage() {
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('jenna_car_token') || ''

    if (!token) {
      window.location.href = '/sign-in?redirect=/mis-citas'
      return
    }

    async function loadAppointments() {
      try {
        const response = await fetch(`${apiUrl}/api/citas/mis-citas`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || 'No fue posible cargar tus citas.')
        }

        setCitas(data.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No fue posible cargar tus citas.')
      } finally {
        setLoading(false)
      }
    }

    loadAppointments()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.15),_transparent_28%),_linear-gradient(180deg,_#0b0b0b_0%,_#111111_100%)] px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-red-500/20 bg-[#141414]/90 p-8 text-center text-sm text-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          Cargando tus citas…
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.18),_transparent_24%),_linear-gradient(180deg,_#0a0a0a_0%,_#111111_100%)] px-4 py-10 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <a href="/" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/70 transition hover:text-white">
            <ArrowLeft size={14} /> Volver al inicio
          </a>
          <div className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-red-300">
            Jenna Car Studio
          </div>
        </div>

        <section className="rounded-[28px] border border-red-500/20 bg-[#141414]/90 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.5)] backdrop-blur-sm sm:p-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-red-400">Reservas</p>
              <h1 className="mt-3 font-serif text-4xl md:text-5xl">Mis citas</h1>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
              <CalendarDays size={22} />
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
          ) : null}

          {!error && citas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-red-500/25 bg-[#1a1a1a] p-8 text-center">
              <p className="text-lg font-medium text-white">Todavía no tienes citas agendadas.</p>
              <a href="/citas" className="mt-5 inline-flex rounded-xl bg-red-600 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-red-500">
                Agendar ahora
              </a>
            </div>
          ) : null}

          <div className="grid gap-4">
            {citas.map((cita) => (
              <article key={cita.id} className="rounded-2xl border border-red-500/20 bg-[#171717] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-300">#{cita.id}</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{cita.servicio.name}</h2>
                  </div>

                  <span className="inline-flex w-fit rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200">
                    {cita.estado}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#101010] px-3 py-2.5">
                    <CalendarDays size={16} className="text-red-300" />
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Fecha</p>
                      <p className="mt-1 text-sm text-white">{cita.fecha}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#101010] px-3 py-2.5">
                    <Clock3 size={16} className="text-red-300" />
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Hora</p>
                      <p className="mt-1 text-sm text-white">{cita.hora}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#101010] px-3 py-2.5">
                    <Wrench size={16} className="text-red-300" />
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Servicio</p>
                      <p className="mt-1 text-sm text-white">{cita.servicio.name}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-white/5 bg-[#101010] p-3">
                    <div className="flex items-center gap-2 text-red-300">
                      <CarFront size={16} />
                      <p className="text-[10px] uppercase tracking-[0.18em]">Vehículo</p>
                    </div>
                    <p className="mt-3 text-sm text-white">{cita.vehiculo.marca} {cita.vehiculo.modelo}</p>
                    <p className="text-sm text-white/70">{cita.vehiculo.placa}</p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-[#101010] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-red-300">Motivo</p>
                    <p className="mt-3 text-sm leading-6 text-white/80">
                      {cita.motivo || cita.observaciones || 'Sin observaciones adicionales.'}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
