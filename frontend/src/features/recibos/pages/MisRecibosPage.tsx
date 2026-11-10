import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Landmark, ShieldAlert, Sparkles } from 'lucide-react'
import { getMisPagos, createPago, getPagoConfig } from '@/features/recibos/services/pagosService'
import { getMisRecibos, getReciboPdf } from '@/features/recibos/services/recibosService'
import { formatCop } from '@/lib/utils'

interface Recibo {
  id: number
  orden_trabajo_id: number
  fecha_ingreso: string
  vehiculo_id: number
  estado: string
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

  const summary = useMemo(() => ({
    pendientes: recibos.filter((recibo) => recibo.estado === 'pendiente').length,
    pagados: recibos.filter((recibo) => recibo.estado === 'pagado').length,
    total: recibos.reduce((sum, recibo) => sum + Number(recibo.total || 0), 0),
  }), [recibos])

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
        estado: (r.estado as string) || 'pendiente',
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

  if (!token) return <main className="min-h-screen bg-[#090909] p-12 text-white">Cargando sesión…</main>
  if (loading && recibos.length === 0) return <main className="min-h-screen bg-[#090909] p-12 text-white">Cargando recibos…</main>

  return (
    <main className="min-h-screen bg-[#090909] px-6 py-8 text-white lg:px-10 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 border-b border-red-900/50 pb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-red-400">Mi cuenta / Finanzas</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-serif text-4xl text-white md:text-5xl">Mis recibos</h1>
            </div>
            <a href="/" className="inline-flex items-center gap-2 border border-red-900/50 bg-red-950/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300 transition hover:border-red-500/70 hover:text-white">
              Inicio
            </a>
          </div>
        </header>

        {simulated && (
          <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
            Modo de demostración: los pagos son simulados y no mueven dinero real.
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-[#70e9d2]/30 bg-[#70e9d2]/10 p-4 text-sm text-[#d6fff9]">
            {message}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="border border-red-900/40 bg-[#151515] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Pendientes</p>
            <p className="mt-4 font-serif text-3xl text-white">{summary.pendientes}</p>
          </div>
          <div className="border border-white/10 bg-[#151515] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Pagados</p>
            <p className="mt-4 font-serif text-3xl text-white">{summary.pagados}</p>
          </div>
          <div className="border border-white/10 bg-[#151515] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Total pendiente</p>
            <p className="mt-4 font-serif text-3xl text-white">{formatCop(summary.total)}</p>
          </div>
        </div>

        <section className="mb-10 overflow-hidden border border-red-900/40 bg-[#121212] shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-3 border-b border-red-900/40 bg-black/30 p-5">
            <div className="border border-red-500/30 bg-red-950/40 p-2 text-red-400">
              <CreditCard size={18} />
            </div>
            <h2 className="font-serif text-2xl text-white">Recibos pendientes</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
                  <th className="p-4">N° Recibo</th>
                  <th className="p-4">Fecha ingreso</th>
                  <th className="p-4">Vehículo</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Acción</th>
                  <th className="p-4">PDF</th>
                </tr>
              </thead>
              <tbody>
                {recibos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center text-sm text-white/50">No tienes recibos pendientes</td>
                  </tr>
                ) : (
                  recibos.map((recibo) => (
                    <tr key={recibo.id} className="border-b border-white/10 text-sm text-white/80">
                      <td className="p-4 font-semibold text-white">#{recibo.id}</td>
                      <td className="p-4 text-white/60">{formatDate(recibo.fecha_ingreso)}</td>
                      <td className="p-4">Vehículo #{recibo.vehiculo_id}</td>
                      <td className="p-4 text-right font-semibold text-[#70e9d2]">{formatCop(recibo.total)}</td>
                      <td className="p-4">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${recibo.estado === 'pendiente' ? 'bg-[#70e9d2]/15 text-[#70e9d2]' : 'bg-white/10 text-white/70'}`}>
                          {recibo.estado}
                        </span>
                      </td>
                      <td className="p-4">
                        {recibo.estado === 'pendiente' ? (
                          <button
                            onClick={() => handlePagar(recibo)}
                            disabled={simulated === null || loading}
                            className="rounded-lg border border-[#70e9d2]/40 bg-[#70e9d2]/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#70e9d2]"
                          >
                            {simulated === null ? 'Cargando modo de pago…' : simulated ? 'Simular pago' : 'Pagar con Mercado Pago'}
                          </button>
                        ) : (
                          <span className="text-[10px] uppercase tracking-[0.12em] text-white/50">{recibo.estado}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={async () => {
                              try {
                                const blob = await getReciboPdf(recibo.id, { token })
                                const url = URL.createObjectURL(blob)
                                window.open(url, '_blank')
                                setTimeout(() => URL.revokeObjectURL(url), 60000)
                              } catch { setMessage('No se pudo abrir el recibo'); return }
                            }}
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 hover:bg-white/10"
                          >
                            Ver recibo
                          </button>
                          <button
                            onClick={async () => {
                              let blob: Blob
                              try { blob = await getReciboPdf(recibo.id, { token }) } catch { setMessage('No se pudo imprimir el recibo'); return }
                              const url = URL.createObjectURL(blob)
                              const win = window.open(url, '_blank')
                              if (win) {
                                win.onload = () => { try { win.print() } catch { /* Browser may block printing. */ } }
                                // Fallback: si el navegador bloquea onload, abrir impresión tras delay
                                setTimeout(() => { try { win.print() } catch { /* Browser may block printing. */ } }, 800)
                              }
                              setTimeout(() => URL.revokeObjectURL(url), 60000)
                            }}
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 hover:bg-white/10"
                          >
                            Imprimir recibo
                          </button>
                          <button
                            onClick={async () => {
                              let blob2: Blob
                              try { blob2 = await getReciboPdf(recibo.id, { download: true, token }) } catch { setMessage('No se pudo descargar el PDF'); return }
                              const blob = blob2
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url; a.download = `recibo-ORDEN-${String(recibo.id).padStart(3,'0')}.pdf`; a.click()
                              URL.revokeObjectURL(url)
                            }}
                            className="rounded-lg bg-[#70e9d2]/15 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#70e9d2] hover:bg-[#70e9d2]/25"
                          >
                            Descargar PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden border border-white/10 bg-[#121212] shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-3 border-b border-white/10 bg-black/30 p-5">
            <div className="border border-white/15 bg-white/5 p-2 text-white/70">
              <Landmark size={18} />
            </div>
            <h2 className="font-serif text-2xl text-white">Historial de pagos</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
                  <th className="p-4">Referencia</th>
                  <th className="p-4 text-right">Monto</th>
                  <th className="p-4">Método</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {pagos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-sm text-white/50">Aún no has realizado pagos</td>
                  </tr>
                ) : (
                  pagos.map((pago) => (
                    <tr key={pago.id} className="border-b border-white/10 text-sm text-white/80">
                      <td className="p-4 font-mono text-xs text-[#70e9d2]">{pago.referencia}</td>
                      <td className="p-4 text-right font-semibold text-white">{formatCop(pago.monto)}</td>
                      <td className="p-4">
                        <span className="inline-block rounded-full bg-[#70e9d2]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#70e9d2]">
                          {pago.metodo_pago}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${pago.estado === 'completado' ? 'bg-[#70e9d2]/15 text-[#70e9d2]' : 'bg-white/10 text-white/70'}`}>
                          {pago.estado}
                        </span>
                      </td>
                      <td className="p-4 text-white/60">{pago.fecha_pago ? formatDate(pago.fecha_pago) : '—'}</td>
                      <td className="p-4">
                        <span className="text-[10px] uppercase tracking-[0.12em] text-[#70e9d2]">{pago.simulacion ? 'Simulado' : 'Mercado Pago'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
