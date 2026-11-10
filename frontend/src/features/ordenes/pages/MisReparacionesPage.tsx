import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Check, Clock3, X } from 'lucide-react'
import { authHeaders, getApiUrl } from '@/services/apiClient'
import { formatCop } from '@/lib/utils'

type RepairImage = { id: number; descripcion: string | null; created_at: string | null }
type RepairOrder = {
  id: number
  fecha_ingreso: string | null
  problema_reportado: string
  estado: string
  estado_aprobacion: 'pendiente' | 'aprobado' | 'rechazado'
  vehiculo: { marca: string; modelo: string; placa: string }
  total: number
  recibo: { id: number; estado: string; enviado_cliente: boolean } | null
  servicios: Array<{ descripcion: string; cantidad: number; precio_unitario: number; subtotal: number }>
  trabajos: Array<{
    id: number
    descripcion: string
    estado: string
    cantidad: number
    subtotal: number
    diagnostico: { descripcion: string; observaciones: string | null; solucion_recomendada: string | null } | null
    imagenes: RepairImage[]
  }>
}

async function requestData<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...init,
    headers: { ...authHeaders(token), ...init?.headers },
  })
  const body = await response.json().catch(() => ({})) as { data?: T; error?: string }
  if (!response.ok) throw new Error(body.error || 'No fue posible completar la solicitud.')
  return body.data as T
}

export default function MisReparacionesPage() {
  const [token] = useState(() => localStorage.getItem('jenna_car_token') || '')
  const [orders, setOrders] = useState<RepairOrder[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadOrders = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const data = await requestData<RepairOrder[]>('/api/ordenes/mis-ordenes', token)
      setOrders(data || [])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible cargar tus reparaciones.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      window.location.href = '/sign-in?redirect=%2Fmis-reparaciones'
      return
    }
    void loadOrders()
  }, [token, loadOrders])

  useEffect(() => {
    let active = true
    const objectUrls: string[] = []
    async function loadImages() {
      const images = orders.flatMap((order) => order.trabajos.flatMap((work) => work.imagenes))
      const entries = await Promise.all(images.map(async (image) => {
        try {
          const response = await fetch(getApiUrl(`/api/mechanic/images/${image.id}`), { headers: authHeaders(token) })
          if (!response.ok) throw new Error('No fue posible cargar una foto de avance.')
          const url = URL.createObjectURL(await response.blob())
          objectUrls.push(url)
          return [image.id, url] as const
        } catch (caught) {
          if (active) setError(caught instanceof Error ? caught.message : 'No fue posible cargar una foto de avance.')
          return null
        }
      }))
      if (active) setPhotoUrls(Object.fromEntries(entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null)))
    }
    void loadImages()
    return () => {
      active = false
      objectUrls.forEach(URL.revokeObjectURL)
    }
  }, [orders, token])

  async function decide(orderId: number, decision: 'aprobado' | 'rechazado') {
    setBusy(orderId)
    setError('')
    setNotice('')
    try {
      await requestData(`/api/ordenes/mis-ordenes/${orderId}/aprobacion`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      setNotice(decision === 'aprobado'
        ? 'Aprobaste la cotización. Administración te enviará el recibo.'
        : 'Rechazaste la cotización. El taller recibió tu respuesta.')
      await loadOrders()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible registrar tu decisión.')
    } finally {
      setBusy(null)
    }
  }

  if (!token) return null

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-8 text-white sm:px-8 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <a href="/profile" className="inline-flex items-center gap-2 text-xs text-white/55 transition hover:text-white"><ArrowLeft size={14} /> Volver al perfil</a>
        <header className="mb-8 mt-6 border-b border-white/10 pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400">Jenna Car / Taller</p>
          <h1 className="mt-2 font-serif text-4xl text-white sm:text-5xl">Mis reparaciones</h1>
          <p className="mt-2 text-sm text-white/50">Revisa el diagnóstico, sigue los avances y aprueba la cotización antes del recibo.</p>
        </header>

        {error && <p role="alert" className="mb-4 border border-red-400/25 bg-red-950/25 p-3 text-sm text-red-200">{error}</p>}
        {notice && <p role="status" className="mb-4 border border-emerald-400/25 bg-emerald-950/20 p-3 text-sm text-emerald-200">{notice}</p>}
        {loading ? <p className="py-8 text-sm text-white/50">Cargando reparaciones…</p> : orders.length === 0 ? (
          <p className="border-y border-white/10 py-8 text-sm text-white/50">Todavía no hay órdenes de trabajo asociadas a tus vehículos.</p>
        ) : (
          <div className="grid gap-5">
            {orders.map((order) => {
              const hasDiagnosis = order.trabajos.some((work) => work.diagnostico)
              const canApprove = order.estado_aprobacion !== 'aprobado' && !order.recibo?.enviado_cliente
                && hasDiagnosis && order.servicios.length > 0 && order.total > 0
              return (
                <article key={order.id} className="rounded-2xl border border-white/10 bg-[#121212] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">Orden #{order.id} · {order.estado}</p>
                      <h2 className="mt-2 text-lg font-medium">{order.vehiculo.marca} {order.vehiculo.modelo}</h2>
                      <p className="mt-1 text-xs text-white/50">{order.vehiculo.placa} · {order.problema_reportado}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/65">
                      Aprobación: {order.estado_aprobacion}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-5 md:grid-cols-2">
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Diagnóstico y cotización</h3>
                      {!hasDiagnosis && <p className="mt-3 text-sm text-white/45">El mecánico aún no registra sus observaciones.</p>}
                      {order.trabajos.map((work) => work.diagnostico && (
                        <div key={`${work.id}-diagnostico`} className="mt-3 border-l-2 border-red-400/50 pl-3">
                          <p className="text-sm text-white/85">{work.diagnostico.descripcion}</p>
                          {work.diagnostico.observaciones && <p className="mt-1 whitespace-pre-wrap text-xs text-white/55">{work.diagnostico.observaciones}</p>}
                          {work.diagnostico.solucion_recomendada && <p className="mt-1 text-xs text-white/45">Recomendación: {work.diagnostico.solucion_recomendada}</p>}
                        </div>
                      ))}
                      <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
                        {order.servicios.map((service, index) => (
                          <li key={`${service.descripcion}-${index}`} className="flex justify-between gap-3 py-2 text-xs">
                            <span className="text-white/65">{service.descripcion} × {service.cantidad}</span>
                            <span className="shrink-0 text-white/80">{formatCop(service.subtotal)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-right text-sm font-semibold">Total propuesto: {formatCop(order.total)}</p>
                      {canApprove ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" disabled={busy !== null} onClick={() => void decide(order.id, 'aprobado')} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50">
                            <Check size={14} /> {busy === order.id ? 'Enviando…' : 'Aprobar reparación'}
                          </button>
                          <button type="button" disabled={busy !== null} onClick={() => void decide(order.id, 'rechazado')} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-xs text-white/65 transition hover:border-red-400/50 hover:text-white disabled:opacity-50">
                            <X size={14} /> Rechazar
                          </button>
                        </div>
                      ) : order.estado_aprobacion === 'aprobado' && !order.recibo?.enviado_cliente ? (
                        <p className="mt-4 text-xs text-emerald-200/80">Aprobada. Administración enviará el recibo cuando esté listo.</p>
                      ) : order.estado_aprobacion === 'rechazado' ? (
                        <p className="mt-4 text-xs text-amber-200/80">Cotización rechazada. Espera una actualización del taller.</p>
                      ) : null}
                    </section>

                    <section>
                      <h3 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/65"><Clock3 size={14} /> Avances del taller</h3>
                      {order.trabajos.flatMap((work) => work.imagenes).length === 0 ? (
                        <p className="mt-3 text-sm text-white/45">El mecánico aún no ha enviado avances con foto.</p>
                      ) : (
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {order.trabajos.flatMap((work) => work.imagenes).map((image) => (
                            <figure key={image.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                              {photoUrls[image.id] ? <img src={photoUrls[image.id]} alt={image.descripcion || 'Avance del vehículo'} className="aspect-square w-full object-cover" /> : <div className="aspect-square animate-pulse bg-white/5" />}
                              <figcaption className="p-2 text-[11px] text-white/60">{image.descripcion || 'Avance de reparación'}</figcaption>
                            </figure>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
