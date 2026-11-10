import { useCallback, useEffect, useMemo, useState } from 'react'
import { Camera, ClipboardList, LogOut, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '@/features/auth/services/authService'
import { authHeaders, getApiUrl } from '@/services/apiClient'

type Appointment = {
  id: number
  fecha: string
  hora: string
  cliente_nombre: string
  placa: string
  marca: string
  modelo: string
  servicio: string
  motivo: string | null
  estado: string
}

type Diagnostic = {
  id: number
  descripcion: string
  observaciones: string | null
  solucion_recomendada: string | null
}

type MechanicWork = {
  id: number
  descripcion: string
  estado: string
  cantidad: number
  subtotal: number
}

type ServiceOption = { id: number; name: string; price: number; description: string | null }

type MechanicDetail = {
  id: number
  fecha: string
  hora: string
  estado: string
  motivo: string | null
  observaciones: string | null
  cliente: { nombre: string; apellido: string; email: string } | null
  vehiculo: { placa: string; marca: string; modelo: string; anio: number | null } | null
  servicio: string | null
  diagnosticos: Diagnostic[]
  trabajos: MechanicWork[]
  ordenes: Array<{ id: number; estado: string; total: number }>
  imagenes: Array<{ id: number; descripcion: string | null; created_at: string | null }>
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

export default function MechanicPanelPage() {
  const navigate = useNavigate()
  const [token] = useState(() => localStorage.getItem('jenna_car_token') || '')
  const [authorized, setAuthorized] = useState(false)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<ServiceOption[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<MechanicDetail | null>(null)
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({})
  const [query, setQuery] = useState('')
  const [diagnosis, setDiagnosis] = useState({ descripcion: '', observaciones: '', solucion_recomendada: '' })
  const [workDescription, setWorkDescription] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [progressNote, setProgressNote] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const filteredAppointments = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return appointments
    return appointments.filter((appointment) => [
      appointment.cliente_nombre,
      appointment.placa,
      appointment.marca,
      appointment.modelo,
      appointment.servicio,
    ].some((value) => value.toLowerCase().includes(term)))
  }, [appointments, query])

  const loadAppointments = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await requestData<Appointment[]>('/api/mechanic/appointments', token)
      setAppointments(data || [])
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible cargar la agenda.')
    } finally {
      setLoading(false)
    }
  }, [token])

  const loadDetail = useCallback(async (appointmentId: number) => {
    if (!token) return
    setSelectedId(appointmentId)
    setDetail(null)
    setSelectedOrderId('')
    setError('')
    try {
      const data = await requestData<MechanicDetail>(`/api/mechanic/appointments/${appointmentId}`, token)
      setDetail(data)
      if (data.ordenes.length === 1) setSelectedOrderId(String(data.ordenes[0]?.id ?? ''))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible cargar la cita.')
    }
  }, [token])

  useEffect(() => {
    let active = true
    const objectUrls: string[] = []
    async function loadImages() {
      if (!detail?.imagenes.length || !token) {
        setPhotoUrls({})
        return
      }
      const entries = await Promise.all(detail.imagenes.map(async (image) => {
        try {
          const response = await fetch(getApiUrl(`/api/mechanic/images/${image.id}`), { headers: authHeaders(token) })
          if (!response.ok) return null
          const url = URL.createObjectURL(await response.blob())
          objectUrls.push(url)
          return [image.id, url] as const
        } catch {
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
  }, [detail?.imagenes, token])

  function chooseService(serviceId: string) {
    setSelectedServiceId(serviceId)
    const service = services.find((item) => item.id === Number(serviceId))
    setUnitPrice(service ? String(service.price) : '')
  }

  async function submitWork() {
    const diagnostic = detail?.diagnosticos[0]
    if (!diagnostic || !selectedOrderId || !selectedServiceId || !workDescription.trim() || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || !Number.isFinite(Number(unitPrice)) || Number(unitPrice) < 0) {
      setError('Selecciona una orden y un servicio, e ingresa descripción y cantidad válidas.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await requestData('/api/mechanic/works', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnostico_id: diagnostic.id,
          orden_id: Number(selectedOrderId),
          servicio_id: Number(selectedServiceId),
          descripcion: workDescription.trim(),
          cantidad: Number(quantity),
          precio: Number(unitPrice),
        }),
      })
      setWorkDescription('')
      setQuantity('1')
      setNotice('Trabajo registrado y cobro actualizado.')
      await loadDetail(selectedId!)
      await loadAppointments()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible registrar el trabajo.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!token) {
      navigate('/sign-in', { replace: true })
      return
    }
    getMe(token).then((data) => {
      if (data.user?.rol !== 'mecanico') {
        navigate(data.user?.rol === 'admin' ? '/admin/dashboard' : '/', { replace: true })
        return
      }
      setAuthorized(true)
      void loadAppointments()
      void requestData<ServiceOption[]>('/api/services', token).then(setServices).catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'No fue posible cargar el catálogo de servicios.')
      })
    }).catch(() => {
      localStorage.removeItem('jenna_car_token')
      localStorage.removeItem('jenna_car_user')
      navigate('/sign-in', { replace: true })
    })
  }, [token, navigate, loadAppointments])

  useEffect(() => {
    let active = true
    const objectUrls: string[] = []
    async function loadImages() {
      if (!detail?.imagenes.length || !token) {
        setPhotoUrls({})
        return
      }
      const entries = await Promise.all(detail.imagenes.map(async (image) => {
        try {
          const response = await fetch(getApiUrl(`/api/mechanic/images/${image.id}`), { headers: authHeaders(token) })
          if (!response.ok) return null
          const url = URL.createObjectURL(await response.blob())
          objectUrls.push(url)
          return [image.id, url] as const
        } catch {
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
  }, [detail?.imagenes, token])

  function signOut() {
    localStorage.removeItem('jenna_car_token')
    localStorage.removeItem('jenna_car_user')
    navigate('/sign-in', { replace: true })
  }

  if (!authorized) return <main className="min-h-screen bg-[#090909] p-8 text-white">Verificando acceso…</main>

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-8 text-white sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400">Jenna Car / Taller</p>
            <h1 className="mt-2 font-serif text-4xl text-white sm:text-5xl">Panel mecánico</h1>
            <p className="mt-2 text-sm text-white/50">Agenda asignada, diagnóstico y evidencia de trabajo.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void loadAppointments()} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/15 px-3 text-xs text-white/70 transition hover:border-red-400/50 hover:text-white"><RefreshCw size={14} /> Actualizar</button>
            <button type="button" onClick={signOut} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/15 px-3 text-xs text-white/70 transition hover:border-red-400/50 hover:text-white"><LogOut size={14} /> Salir</button>
          </div>
        </header>

        {error && <p role="alert" className="mb-4 border border-red-400/25 bg-red-950/25 p-3 text-sm text-red-200">{error}</p>}
        {notice && <p role="status" className="mb-4 border border-emerald-400/25 bg-emerald-950/20 p-3 text-sm text-emerald-200">{notice}</p>}

        <div className="grid gap-8 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.5fr)]">
          <section aria-label="Agenda asignada">
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-sm font-semibold text-white">Citas asignadas</h2>
              <span className="text-xs tabular-nums text-white/40">{appointments.length}</span>
            </div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente o vehículo" className="mb-3 h-10 w-full rounded-md border border-white/10 bg-[#111] px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-500/60" />
            {loading ? <p className="py-6 text-sm text-white/45">Cargando agenda…</p> : filteredAppointments.length === 0 ? <p className="border-y border-white/10 py-8 text-sm text-white/45">No hay citas asignadas.</p> : (
              <div className="divide-y divide-white/10 border-y border-white/10">
                {filteredAppointments.map((appointment) => (
                  <button key={appointment.id} type="button" onClick={() => void loadDetail(appointment.id)} className={`w-full px-3 py-4 text-left transition hover:bg-white/[0.04] ${selectedId === appointment.id ? 'border-l-2 border-red-400 bg-red-950/15' : 'border-l-2 border-transparent'}`}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-white">{appointment.cliente_nombre}</span>
                      <span className="text-[10px] uppercase text-red-300">#{appointment.id}</span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-white/55">{appointment.marca} {appointment.modelo} · {appointment.placa}</span>
                    <span className="mt-1 block truncate text-xs text-white/40">{appointment.fecha} · {appointment.hora} · {appointment.servicio}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section aria-label="Detalle de cita" className="min-w-0">
            {!selectedId ? (
              <div className="flex min-h-56 flex-col items-center justify-center border-y border-white/10 text-center">
                <ClipboardList size={23} className="mb-3 text-red-400/80" />
                <p className="text-sm text-white/70">Selecciona una cita</p>
                <p className="mt-1 text-xs text-white/40">El diagnóstico, el trabajo y las fotos aparecerán aquí.</p>
              </div>
            ) : !detail ? (
              <p className="py-8 text-sm text-white/45">Cargando detalle…</p>
            ) : (
              <div className="space-y-8">
                <section className="border-b border-white/10 pb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-400">Cita #{detail.id} · {detail.estado}</p>
                  <h2 className="mt-2 font-serif text-2xl text-white">{detail.vehiculo?.marca} {detail.vehiculo?.modelo}</h2>
                  <p className="mt-1 text-sm text-white/60">{detail.vehiculo?.placa} · {detail.cliente?.nombre} {detail.cliente?.apellido}</p>
                  <p className="mt-1 text-xs text-white/45">{detail.fecha} · {detail.hora} · {detail.servicio}</p>
                  {detail.motivo && <p className="mt-3 text-sm text-white/75">{detail.motivo}</p>}
                </section>

                {!detail.diagnosticos.length ? (
                  <section className="grid gap-3">
                    <h3 className="text-sm font-semibold text-white">Registrar diagnóstico</h3>
                    <textarea value={diagnosis.descripcion} onChange={(event) => setDiagnosis((value) => ({ ...value, descripcion: event.target.value }))} placeholder="Descripción del diagnóstico" rows={3} className="w-full rounded-md border border-white/10 bg-[#111] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-500/60" />
                    <textarea value={diagnosis.observaciones} onChange={(event) => setDiagnosis((value) => ({ ...value, observaciones: event.target.value }))} placeholder="Observaciones" rows={2} className="w-full rounded-md border border-white/10 bg-[#111] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-500/60" />
                    <textarea value={diagnosis.solucion_recomendada} onChange={(event) => setDiagnosis((value) => ({ ...value, solucion_recomendada: event.target.value }))} placeholder="Solución recomendada" rows={2} className="w-full rounded-md border border-white/10 bg-[#111] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-500/60" />
                    <button type="button" disabled={busy || !diagnosis.descripcion.trim()} onClick={async () => {
                      setBusy(true)
                      try {
                        await requestData('/api/mechanic/diagnostics', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cita_id: detail.id, ...diagnosis, estado: 'pendiente' }) })
                        setDiagnosis({ descripcion: '', observaciones: '', solucion_recomendada: '' })
                        await loadDetail(detail.id)
                        setNotice('Diagnóstico guardado.')
                      } catch (caught) { setError(caught instanceof Error ? caught.message : 'No fue posible guardar el diagnóstico.') }
                      finally { setBusy(false) }
                    }} className="h-10 rounded-md bg-red-600 px-4 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-40">Guardar diagnóstico</button>
                  </section>
                ) : (
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-white">Diagnóstico</h3>
                    {detail.diagnosticos.map((item) => <article key={item.id} className="border-l-2 border-red-400/60 pl-4"><p className="text-sm text-white/85">{item.descripcion}</p>{item.solucion_recomendada && <p className="mt-1 text-xs text-white/50">Recomendación: {item.solucion_recomendada}</p>}</article>)}
                    <section className="grid gap-3 border-t border-white/10 pt-5">
                      <h3 className="text-sm font-semibold text-white">Proponer trabajo y cotización</h3>
                      {detail.ordenes.length === 0 ? (
                        <p className="text-sm text-amber-200/80">No hay una orden activa con recibo pendiente para este vehículo. Solicita que administración cree una orden.</p>
                      ) : (
                        <>
                          <label className="grid gap-2 text-xs text-white/55">Orden de trabajo
                            <select value={selectedOrderId} onChange={(event) => setSelectedOrderId(event.target.value)} className="h-11 w-full rounded-md border border-white/10 bg-[#111] px-3 text-sm text-white outline-none focus:border-red-500/60">
                              {detail.ordenes.map((order) => <option key={order.id} value={order.id}>Orden #{order.id} · ${Number(order.total).toFixed(2)}</option>)}
                            </select>
                          </label>
                          <label className="grid gap-2 text-xs text-white/55">Servicio
                            <select value={selectedServiceId} onChange={(event) => chooseService(event.target.value)} className="h-11 w-full rounded-md border border-white/10 bg-[#111] px-3 text-sm text-white outline-none focus:border-red-500/60">
                              <option value="">Selecciona servicio</option>
                              {services.map((service) => <option key={service.id} value={service.id}>{service.name} · ${Number(service.price).toFixed(2)}</option>)}
                            </select>
                          </label>
                          <label className="grid gap-2 text-xs text-white/55">Descripción del trabajo
                            <textarea value={workDescription} onChange={(event) => setWorkDescription(event.target.value)} rows={2} className="w-full rounded-md border border-white/10 bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-red-500/60" />
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="grid gap-2 text-xs text-white/55">Cantidad
                              <input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-11 w-full rounded-md border border-white/10 bg-[#111] px-3 text-sm text-white outline-none focus:border-red-500/60" />
                            </label>
                            <div className="grid gap-2 text-xs text-white/55">Precio unitario
                              <p className="flex h-11 items-center border border-white/10 bg-[#111] px-3 text-sm text-white">${Number(unitPrice || 0).toFixed(2)}</p>
                            </div>
                          </div>
                          <p className="text-right text-sm font-semibold text-white">Total del trabajo: ${(Number(unitPrice || 0) * Number(quantity || 0)).toFixed(2)}</p>
                          <button type="button" disabled={busy || !selectedOrderId || !selectedServiceId} onClick={() => void submitWork()} className="h-10 rounded-md bg-red-600 px-4 text-xs font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40">Guardar propuesta y enviar al cliente</button>
                        </>
                      )}
                    </section>
                    <div className="grid gap-3 border-t border-white/10 pt-5">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Trabajos y avances para el cliente</h3>
                        <p className="mt-1 text-xs text-white/45">Cada foto se enviará como una nueva notificación. Puedes publicar tantos avances como necesites.</p>
                      </div>
                      <textarea value={progressNote} onChange={(event) => setProgressNote(event.target.value)} placeholder="Describe qué estás revisando o reparando" rows={2} className="w-full rounded-md border border-white/10 bg-[#111] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-500/60" />
                      {detail.trabajos.map((work) => (
                        <article key={work.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-3">
                          <div><p className="text-sm text-white">{work.descripcion}</p><p className="mt-1 text-xs text-white/45">{work.estado} · {work.cantidad} un. · ${Number(work.subtotal).toFixed(2)}</p></div>
                          <label className={`inline-flex h-9 items-center gap-2 rounded-md border border-white/15 px-3 text-xs text-white/70 transition hover:border-red-400/50 hover:text-white ${busy || !progressNote.trim() ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'}`}>
                            <Camera size={14} /> Subir foto
                            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy || !progressNote.trim()} onChange={async (event) => {
                              const file = event.target.files?.[0]
                              event.target.value = ''
                              if (!file) return
                              if (file.size > 4 * 1024 * 1024) { setError('La foto debe pesar menos de 4 MB.'); return }
                              const body = new FormData()
                              body.append('file', file)
                              body.append('descripcion', progressNote.trim())
                              setBusy(true)
                              try {
                                await requestData(`/api/mechanic/works/${work.id}/images`, token, { method: 'POST', body })
                                setProgressNote('')
                                await loadDetail(detail.id)
                                setNotice('Avance enviado y notificado al cliente.')
                              } catch (caught) { setError(caught instanceof Error ? caught.message : 'No fue posible subir la foto.') }
                              finally { setBusy(false) }
                            }} />
                          </label>
                        </article>
                      ))}
                    </div>
                    {detail.imagenes.length > 0 && <div className="flex flex-wrap gap-3">{detail.imagenes.map((image) => <div key={image.id} className="grid gap-1">{photoUrls[image.id] ? <img src={photoUrls[image.id]} alt={image.descripcion || 'Evidencia de reparación'} className="h-24 w-24 rounded-md border border-white/10 object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-md border border-white/10 text-xs text-white/40">Cargando foto</div>}<span className="max-w-24 truncate text-[10px] text-white/45">{image.descripcion || 'Evidencia'}</span></div>)}</div>}
                  </section>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}