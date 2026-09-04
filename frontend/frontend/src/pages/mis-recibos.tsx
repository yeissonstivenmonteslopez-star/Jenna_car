
import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Landmark, ShieldAlert, Sparkles } from 'lucide-react'
import { getApiUrl } from '@/lib/config'

const apiUrl = getApiUrl('')

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
  const [token, setToken] = useState<string>('')
  const [recibos, setRecibos] = useState<Recibo[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string>('')
  const [openPay, setOpenPay] = useState(false)
  const [pagoData, setPagoData] = useState<{
    recibo_id: number | null
    numero_nequi: string
    monto: number
    referencia: string
  } | null>(null)

  const summary = useMemo(() => ({
    pendientes: recibos.filter((recibo) => recibo.estado === 'pendiente').length,
    pagados: pagos.length,
    total: recibos.reduce((sum, recibo) => sum + Number(recibo.total || 0), 0),
  }), [recibos, pagos])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''
    setToken(token)
    if (!token) { window.location.href = '/sign-in'; return }
  }, [])

  useEffect(() => {
    if (!token) return
    fetchRecibos()
    fetchPagos()
  }, [token])

  const fetchRecibos = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/recibos/mis-recibos`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const j = await res.json()
        const data = (j.data || []).map((r: any) => ({
          id: r.id,
          orden_trabajo_id: r.orden_trabajo_id || r.orden_id,
          fecha_ingreso: r.fecha_ingreso || r.creado_en || new Date().toISOString(),
          vehiculo_id: r.vehiculo_id || r.vehiculo?.id || 0,
          estado: r.estado || 'pendiente',
          total: r.total || 0,
          creado_en: r.creado_en || r.fecha_ingreso || new Date().toISOString(),
        }))
        setRecibos(data)
        if (data.length === 0) setMessage('')
      } else {
        setRecibos([])
      }
    } catch (err) {
      setMessage('Error al cargar recibos')
    } finally {
      setLoading(false)
    }
  }

  const fetchPagos = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/pagos/mis-pagos`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setPagos(data.data || [])
      }
    } catch (err) {
      // Ignorar errores al cargar pagos
    }
  }

  const handlePagar = (recibo: Recibo) => {
    setPagoData({
      recibo_id: recibo.id,
      numero_nequi: '',
      monto: recibo.total,
      referencia: '',
    })
    setOpenPay(true)
  }

  const handleConfirmarPago = async () => {
    const { recibo_id, numero_nequi } = pagoData!
    if (!numero_nequi.trim()) {
      setMessage('Por favor ingresa un número de Nequi')
      return
    }

    setMessage('')
    setLoading(true)

    try {
      const response = await fetch(`${apiUrl}/api/pagos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recibo_id, numero_nequi }),
      })

      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || 'Error al procesar el pago')
        setLoading(false)
        return
      }

      setMessage(`¡${data.data.mensaje || 'Pago procesado correctamente'}`)
      setOpenPay(false)
      fetchRecibos()
      fetchPagos()
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      setMessage('Error de conexión con el servidor')
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
            <p className="mt-4 font-serif text-3xl text-white">${summary.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
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
                      <td className="p-4 text-right font-semibold text-[#70e9d2]">${Number(recibo.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td className="p-4">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${recibo.estado === 'pendiente' ? 'bg-[#70e9d2]/15 text-[#70e9d2]' : 'bg-white/10 text-white/70'}`}>
                          {recibo.estado}
                        </span>
                      </td>
                      <td className="p-4">
                        {recibo.estado === 'pendiente' ? (
                          <button
                            onClick={() => handlePagar(recibo)}
                            className="rounded-lg border border-[#70e9d2]/40 bg-[#70e9d2]/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#70e9d2]"
                          >
                            Pagar con Nequi
                          </button>
                        ) : (
                          <span className="text-[10px] uppercase tracking-[0.12em] text-white/50">Pagado</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={async () => {
                              const res = await fetch(`${apiUrl}/api/recibos/${recibo.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
                              if (!res.ok) { setMessage('No se pudo abrir el recibo'); return }
                              const blob = await res.blob()
                              const url = URL.createObjectURL(blob)
                              window.open(url, '_blank')
                              setTimeout(() => URL.revokeObjectURL(url), 60000)
                            }}
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 hover:bg-white/10"
                          >
                            Ver recibo
                          </button>
                          <button
                            onClick={async () => {
                              const res = await fetch(`${apiUrl}/api/recibos/${recibo.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
                              if (!res.ok) { setMessage('No se pudo imprimir el recibo'); return }
                              const blob = await res.blob()
                              const url = URL.createObjectURL(blob)
                              const win = window.open(url, '_blank')
                              if (win) {
                                win.onload = () => { try { win.print() } catch {} }
                                // Fallback: si el navegador bloquea onload, abrir impresión tras delay
                                setTimeout(() => { try { win.print() } catch {} }, 800)
                              }
                              setTimeout(() => URL.revokeObjectURL(url), 60000)
                            }}
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 hover:bg-white/10"
                          >
                            Imprimir recibo
                          </button>
                          <button
                            onClick={async () => {
                              const res = await fetch(`${apiUrl}/api/recibos/${recibo.id}/pdf?download=true`, { headers: { Authorization: `Bearer ${token}` } })
                              if (!res.ok) { setMessage('No se pudo descargar el PDF'); return }
                              const blob = await res.blob()
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
                      <td className="p-4 text-right font-semibold text-white">${Number(pago.monto || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
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
                        <span className="text-[10px] uppercase tracking-[0.12em] text-[#70e9d2]">{pago.simulacion ? 'Simulado' : 'Real'}</span>
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#70e9d2]">Nequi</p>
                <h2 className="mt-3 font-serif text-3xl text-white">Pagar recibo</h2>
              </div>
              <button onClick={() => setOpenPay(false)} className="text-white/60 hover:text-[#70e9d2]">✕</button>
            </div>

            <div className="mt-6">
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">Recibo #{pagoData.recibo_id}</p>
                <p className="mt-2 font-serif text-2xl text-[#70e9d2]">${pagoData.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="mb-6 rounded-2xl border border-[#70e9d2]/20 bg-[#70e9d2]/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-[#70e9d2]">
                  <ShieldAlert size={16} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Pago simulado</span>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d6fff9]">PAGO SIMULADO — NO ES UNA TRANSACCIÓN REAL</p>
                <p className="mt-2 text-xs text-white/60">Esta simulación no mueve dinero real ni afecta cuentas bancarias.</p>
              </div>

              <form onSubmit={(event) => { event.preventDefault(); handleConfirmarPago() }} className="grid gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">Número de Nequi</label>
                  <input
                    type="text"
                    value={pagoData.numero_nequi}
                    onChange={(event) => setPagoData({ ...pagoData, numero_nequi: event.target.value })}
                    placeholder="Ingresa tu número de Nequi"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#70e9d2]/60"
                  />
                </div>
                <button type="submit" className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#70e9d2] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#07131b] transition hover:bg-[#8ff6e4]">
                  <Sparkles size={15} /> Confirmar pago
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}