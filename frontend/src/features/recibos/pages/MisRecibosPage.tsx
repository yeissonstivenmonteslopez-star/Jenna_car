import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Download, Eye, Landmark, Printer, ReceiptText, ShieldAlert, Sparkles } from 'lucide-react'
import { getMisPagos, createPago, getPagoConfig } from '@/features/recibos/services/pagosService'
import { getMisRecibos, getReciboPdf } from '@/features/recibos/services/recibosService'
import { formatCop } from '@/lib/utils'

interface Recibo {
  id: number
  orden_trabajo_id: number
  fecha_ingreso: string
  vehiculo_id: number
  vehiculo: { marca: string; modelo: string; placa: string } | null
  estado: string
  subtotal: number
  descuento: number
  total: number
  creado_en: string
}

interface Pago {
  id: number
  recibo_id: number
  monto: number
  metodo_pago: string
  referencia: string
  estado: string
  fecha_pago: string | null
  creado_en: string
  simulacion: boolean
}

export default function MisRecibos() {
  const [token] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''))
  const [recibos, setRecibos] = useState<Recibo[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string>('')
  const [openPay, setOpenPay] = useState(false)
  const [simulated, setSimulated] = useState<boolean | null>(null)
  const [pagoData, setPagoData] = useState<{
    recibo_id: number | null
    monto: number
    referencia: string
  } | null>(null)

  const summary = useMemo(() => {
    const pendientes = recibos.filter((recibo) => recibo.estado === 'pendiente')
    const pagados = recibos.filter((recibo) => recibo.estado === 'pagado')
    return {
      pendientes: pendientes.length,
      pagados: pagados.length,
      totalPendiente: pendientes.reduce((sum, recibo) => sum + Number(recibo.total || 0), 0),
      totalPagado: pagados.reduce((sum, recibo) => sum + Number(recibo.total || 0), 0),
    }
  }, [recibos])

  useEffect(() => {
    if (!token) { window.location.href = '/sign-in'; return }
  }, [token])

  const fetchRecibos = async () => {
    setLoading(true)
    try {
      const j = await getMisRecibos(token)
      const data = ((j as { data?: Record<string, unknown>[] }).data || []).map((r: Record<string, unknown>) => ({
        id: r.id as number,
        orden_trabajo_id: (r.orden_trabajo_id as number) || (r.orden_id as number),
        fecha_ingreso: (r.fecha_ingreso as string) || (r.creado_en as string) || new Date().toISOString(),
        vehiculo_id: (r.vehiculo_id as number) || ((r.vehiculo as Record<string, unknown>)?.id as number) || 0,
        vehiculo: r.vehiculo as Recibo['vehiculo'] || null,
        estado: (r.estado as string) || 'pendiente',
        subtotal: Number(r.subtotal || 0),
        descuento: Number(r.descuento || 0),
        total: (r.total as number) || 0,
        creado_en: (r.creado_en as string) || (r.fecha_ingreso as string) || new Date().toISOString(),
      })) as Recibo[]
      setRecibos(data)
      if (data.length === 0) setMessage('')
    } catch {
      setMessage('Error al cargar recibos')
    } finally {
      setLoading(false)
    }
  }

  const fetchPagos = async () => {
    try {
      const data = await getMisPagos(token)
      setPagos((data as { data?: unknown[] }).data as Pago[] || [])
    } catch {
      // Ignorar errores al cargar pagos
    }
  }

  useEffect(() => {
    if (!token) return
    fetchRecibos()
    fetchPagos()
    getPagoConfig(token)
      .then((result) => setSimulated(result.data.simulacion === true))
      .catch((error: unknown) => setMessage((error as Error).message))
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePagar = (recibo: Recibo) => {
    setMessage('')
    setPagoData({
      recibo_id: recibo.id,
      monto: recibo.total,
      referencia: '',
    })
    setOpenPay(true)
  }

  const handleConfirmarPago = async () => {
    if (loading || !pagoData?.recibo_id) return
    const { recibo_id } = pagoData

    setMessage('')
    setLoading(true)

    try {
      const data = await createPago({ recibo_id }, token)
      if (data.data.simulacion === true) {
        setOpenPay(false)
        await Promise.all([fetchRecibos(), fetchPagos()])
        setMessage(data.data.mensaje || 'Pago simulado registrado. No se ha cobrado dinero real.')
        return
      }
      const checkout = new URL(data.data.url_redireccion)
      if (checkout.protocol !== 'https:' || !/(^|\.)mercadopago\.com(\.[a-z]{2})?$/.test(checkout.hostname)) {
        throw new Error('La pasarela no devolvió un enlace de pago válido')
      }
      window.location.assign(checkout.href)
    } catch (err: unknown) {
      setMessage((err as Error).message || 'Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    return dateStr.substring(0, 10)
  }

  async function handlePdf(reciboId: number, action: 'view' | 'print' | 'download') {
    let blob: Blob
    try {
      blob = await getReciboPdf(reciboId, { download: action === 'download', token })
    } catch {
      setMessage(action === 'download' ? 'No se pudo descargar el PDF' : action === 'print' ? 'No se pudo imprimir el recibo' : 'No se pudo abrir el recibo')
      return
    }

    const url = URL.createObjectURL(blob)
    if (action === 'download') {
      const link = document.createElement('a')
      link.href = url
      link.download = `recibo-ORDEN-${String(reciboId).padStart(3, '0')}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      return
    }

    const win = window.open(url, '_blank')
    if (!win) {
      setMessage('El navegador bloqueó la ventana del recibo. Permite ventanas emergentes para abrirlo.')
      URL.revokeObjectURL(url)
      return
    }
    if (action === 'print') {
      win.onload = () => { try { win.print() } catch { /* Browser may block printing. */ } }
      setTimeout(() => { try { win.print() } catch { /* Browser may block printing. */ } }, 800)
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  const recibosPendientes = recibos.filter((recibo) => recibo.estado === 'pendiente')
  const recibosHistorial = recibos.filter((recibo) => recibo.estado !== 'pendiente')
  const pdfActions = (reciboId: number) => (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => void handlePdf(reciboId, 'view')} aria-label={`Ver recibo ${reciboId}`} title="Ver recibo" className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white/55 transition hover:border-white/25 hover:bg-white/5 hover:text-white"><Eye size={16} /></button>
      <button type="button" onClick={() => void handlePdf(reciboId, 'print')} aria-label={`Imprimir recibo ${reciboId}`} title="Imprimir recibo" className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white/55 transition hover:border-white/25 hover:bg-white/5 hover:text-white"><Printer size={16} /></button>
      <button type="button" onClick={() => void handlePdf(reciboId, 'download')} aria-label={`Descargar recibo ${reciboId}`} title="Descargar PDF" className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white/55 transition hover:border-red-500/40 hover:bg-red-950/30 hover:text-red-200"><Download size={16} /></button>
    </div>
  )

  if (!token) return <main className="min-h-screen bg-[#090909] p-12 text-white">Cargando sesión…</main>
  if (loading && recibos.length === 0) return <main className="min-h-screen bg-[#090909] p-12 text-white">Cargando recibos…</main>

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-8 text-white sm:px-8 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-red-400">Mi cuenta / Finanzas</p>
            <h1 className="mt-2 font-serif text-4xl text-white sm:text-5xl">Mis recibos</h1>
            <p className="mt-2 max-w-xl text-sm text-white/50">Consulta tus cobros, descarga comprobantes y revisa tus pagos.</p>
          </div>
          <a href="/" className="inline-flex h-10 items-center justify-center rounded-md border border-white/15 px-4 text-xs font-semibold text-white/70 transition hover:border-red-400/50 hover:text-white">Inicio</a>
        </header>

        {simulated && (
          <div className="mb-6 flex items-start gap-3 border border-amber-400/30 bg-amber-400/[0.07] p-4 text-sm text-amber-100">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-300" />
            <p><strong className="font-semibold">Modo de demostración.</strong> Los pagos se simulan; no se mueve dinero real.</p>
          </div>
        )}

        {message && <div role="status" className="mb-6 border border-red-400/30 bg-red-950/25 p-4 text-sm text-red-100">{message}</div>}

        <section aria-label="Resumen financiero" className="mb-10 grid grid-cols-1 divide-y divide-white/10 border-y border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="py-4 sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Recibos pendientes</p>
            <p className="mt-2 font-serif text-3xl text-white">{summary.pendientes}</p>
          </div>
          <div className="py-4 sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Saldo por pagar</p>
            <p className="mt-2 font-serif text-2xl text-red-300 sm:text-3xl">{formatCop(summary.totalPendiente)}</p>
          </div>
          <div className="py-4 sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Recibos pagados</p>
            <p className="mt-2 font-serif text-3xl text-white">{summary.pagados}</p>
            {summary.totalPagado > 0 && <p className="mt-1 text-xs text-white/45">{formatCop(summary.totalPagado)} pagados</p>}
          </div>
        </section>

        <section aria-labelledby="pending-heading" className="mb-12">
          <header className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <CreditCard size={17} className="text-red-400" />
              <h2 id="pending-heading" className="text-sm font-semibold text-white">Por pagar</h2>
              <span className="text-xs tabular-nums text-white/40">{recibosPendientes.length}</span>
            </div>
            {loading && <span className="text-xs text-white/40">Actualizando…</span>}
          </header>

          {recibosPendientes.length === 0 ? (
            <div className="flex min-h-36 flex-col items-center justify-center border-y border-white/10 py-8 text-center">
              <ReceiptText size={23} className="mb-3 text-white/30" />
              <p className="text-sm text-white/70">No tienes recibos pendientes</p>
              <p className="mt-1 text-xs text-white/40">Cuando se genere un cobro aparecerá aquí.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10 border-y border-white/10">
              {recibosPendientes.map((recibo) => (
                <article key={recibo.id} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">Recibo #{recibo.id}</p>
                      <span className="border border-amber-400/25 bg-amber-400/[0.07] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-200">Pendiente</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-white/65">{recibo.vehiculo ? `${recibo.vehiculo.marca} ${recibo.vehiculo.modelo} · ${recibo.vehiculo.placa}` : `Vehículo #${recibo.vehiculo_id}`}</p>
                    <p className="mt-1 text-xs text-white/40">Ingreso {formatDate(recibo.fecha_ingreso)}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                    <p className="min-w-32 text-right font-serif text-xl text-white">{formatCop(recibo.total)}</p>
                    <button
                      onClick={() => handlePagar(recibo)}
                      disabled={simulated === null || loading}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-xs font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CreditCard size={15} />
                      {simulated === null ? 'Cargando…' : simulated ? 'Simular pago' : 'Pagar recibo'}
                    </button>
                    {pdfActions(recibo.id)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="history-heading" className="mb-12">
          <header className="mb-3 flex items-center gap-2.5">
            <ReceiptText size={17} className="text-white/50" />
            <h2 id="history-heading" className="text-sm font-semibold text-white">Historial de recibos</h2>
            <span className="text-xs tabular-nums text-white/40">{recibosHistorial.length}</span>
          </header>
          {recibosHistorial.length === 0 ? (
            <div className="border-y border-white/10 py-6 text-sm text-white/45">Tus recibos pagados o anulados aparecerán aquí.</div>
          ) : (
            <div className="divide-y divide-white/10 border-y border-white/10">
              {recibosHistorial.map((recibo) => (
                <article key={recibo.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">Recibo #{recibo.id}</p>
                    <p className="mt-1 truncate text-xs text-white/45">{recibo.vehiculo ? `${recibo.vehiculo.marca} ${recibo.vehiculo.modelo} · ${recibo.vehiculo.placa}` : `Vehículo #${recibo.vehiculo_id}`} · {formatDate(recibo.fecha_ingreso)}</p>
                  </div>
                  <span className={`w-fit border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${recibo.estado === 'pagado' ? 'border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200' : 'border-white/10 bg-white/[0.03] text-white/50'}`}>{recibo.estado === 'pagado' ? 'Pagado' : 'Anulado'}</span>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <p className="font-medium text-white/75">{formatCop(recibo.total)}</p>
                    {pdfActions(recibo.id)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="payments-heading">
          <header className="mb-3 flex items-center gap-2.5 border-b border-white/10 pb-3">
            <Landmark size={17} className="text-white/50" />
            <h2 id="payments-heading" className="text-sm font-semibold text-white">Historial de pagos</h2>
          </header>
          {pagos.length === 0 ? (
            <p className="py-5 text-sm text-white/45">Aún no has realizado pagos.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {pagos.map((pago) => (
                <article key={pago.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-white/75">{pago.referencia || `Recibo #${pago.recibo_id}`}</p>
                    <p className="mt-1 text-xs text-white/40">{pago.metodo_pago} · {pago.fecha_pago ? formatDate(pago.fecha_pago) : 'Sin fecha'}</p>
                  </div>
                  <span className={`w-fit text-[10px] font-semibold uppercase tracking-[0.1em] ${pago.estado === 'completado' ? 'text-emerald-300' : 'text-white/45'}`}>{pago.estado}</span>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <p className="font-medium text-white">{formatCop(pago.monto)}</p>
                    <span className="border border-white/10 px-2 py-1 text-[9px] uppercase text-white/45">{pago.simulacion ? 'Simulado' : 'Mercado Pago'}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {openPay && pagoData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="w-full max-w-md border border-red-900/50 bg-[#151515] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#70e9d2]">{simulated ? 'Demostración' : 'Mercado Pago'}</p>
                <h2 className="mt-3 font-serif text-3xl text-white">{simulated ? 'Simular pago' : 'Pagar recibo'}</h2>
              </div>
              <button onClick={() => setOpenPay(false)} className="text-white/60 hover:text-[#70e9d2]">✕</button>
            </div>

            <div className="mt-6">
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">Recibo #{pagoData.recibo_id}</p>
                <p className="mt-2 font-serif text-2xl text-[#70e9d2]">{formatCop(pagoData.monto)}</p>
              </div>

              <div className="mb-6 rounded-2xl border border-[#70e9d2]/20 bg-[#70e9d2]/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-[#70e9d2]">
                  <ShieldAlert size={16} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{simulated ? 'Pago simulado' : 'Pago seguro'}</span>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d6fff9]">{simulated ? 'NO ES UNA TRANSACCIÓN REAL' : 'Completa el pago en Mercado Pago'}</p>
                <p className="mt-2 text-xs text-white/60">{simulated ? 'Se registrará un pago de demostración y el recibo quedará pagado en la aplicación. No se realizarán cobros ni transferencias.' : 'Elige entre los medios disponibles en la pasarela. El recibo se actualizará al recibir la confirmación del pago.'}</p>
              </div>

              <form onSubmit={(event) => { event.preventDefault(); handleConfirmarPago() }} className="grid gap-4">
                {message && <p role="alert" className="text-sm text-red-300">{message}</p>}
                <button type="submit" disabled={loading} className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#70e9d2] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#07131b] transition hover:bg-[#8ff6e4]">
                  <Sparkles size={15} /> {loading ? 'Procesando…' : simulated ? 'Confirmar pago simulado' : 'Continuar a Mercado Pago'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
