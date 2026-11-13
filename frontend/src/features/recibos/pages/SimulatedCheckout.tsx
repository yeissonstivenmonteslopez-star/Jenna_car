import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { authHeaders, getApiUrl } from '@/services/apiClient'
import { formatCop } from '@/lib/utils'
import { detectBrand, formatCard, TEST_CARDS, validTestCard } from '../services/testCards'

function BrandLogo({ brand }: { brand: string }) {
  if (brand === 'mastercard') return <svg role="img" aria-label="Mastercard" viewBox="0 0 70 44" className="h-10 w-16"><circle cx="25" cy="22" r="19" fill="#eb001b" /><circle cx="45" cy="22" r="19" fill="#f79e1b" fillOpacity=".9" /></svg>
  if (brand === 'amex') return <span aria-label="American Express" className="rounded bg-blue-600 p-2 text-center text-[9px] font-bold leading-tight text-white">AMERICAN<br />EXPRESS</span>
  if (brand === 'visa') return <span aria-label="Visa" className="text-2xl font-black italic text-white">VISA</span>
  return <span className="text-xs text-white/50">TARJETA DE PRUEBA</span>
}

export default function SimulatedCheckout({ receiptId, amount, token, onClose, onPaid }: {
  receiptId: number; amount: number; token: string; onClose: () => void; onPaid: () => Promise<void>
}) {
  const [method, setMethod] = useState('tarjeta')
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [outcome, setOutcome] = useState('aprobado')
  const [phone, setPhone] = useState('3000000000')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ referencia: string; estado: string; monto: number } | null>(null)
  const key = useRef(crypto.randomUUID())
  const [submitted, setSubmitted] = useState(false)
  const brand = detectBrand(number)
  const inputClass = 'w-full rounded-lg border border-white/15 bg-black/40 p-3 text-sm text-white outline-none focus:border-red-400'

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    if (method === 'tarjeta') {
      if (!validTestCard(number)) { setError('Selecciona uno de los números de prueba indicados.'); return }
      const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry)
      const now = new Date()
      if (!match || new Date(2000 + Number(match[2]), Number(match[1]), 1) <= now || !new RegExp(`^\\d{${brand === 'amex' ? 4 : 3}}$`).test(cvv)) {
        setError('Comprueba vencimiento MM/AA y código ficticio (3 dígitos; Amex: 4).'); return
      }
    } else if (phone !== '3000000000') { setError('Usa exclusivamente el celular ficticio 3000000000.'); return }
    setBusy(true); setSubmitted(true)
    try {
      const response = await fetch(getApiUrl('/api/pagos/simulados'), {
        method: 'POST', headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        // Card number, expiry, CVV and phone stay only in component memory.
        body: JSON.stringify({ recibo_id: receiptId, metodo: method, franquicia: brand, resultado: outcome, idempotencia: key.current }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'No fue posible simular el pago')
      setResult(body.data); setNumber(''); setCvv(''); setExpiry('')
      await onPaid()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Error de conexión. Reintenta con la misma selección. La referencia se conserva.') }
    finally { setBusy(false) }
  }

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="checkout-title" className="mx-auto my-6 max-w-xl rounded-2xl border border-red-500/30 bg-[#111] p-5 text-white shadow-2xl sm:p-8">
      <header className="flex justify-between gap-4"><div><p className="text-xs font-bold tracking-widest text-red-400">JENNA CAR · PAGO SIMULADO</p><h2 id="checkout-title" className="mt-2 font-serif text-3xl">Pasarela de prueba</h2></div><button type="button" disabled={busy} onClick={onClose} aria-label="Cerrar pasarela" className="self-start p-2 text-white/70">✕</button></header>
      <p className="my-4 border-l-2 border-amber-400 pl-3 text-xs leading-relaxed text-amber-200">No se cobra dinero real. Usa únicamente los datos ficticios indicados. No introduzcas tarjetas reales, claves ni PIN.</p>
      <div className="mb-5 flex items-end justify-between border-b border-white/10 pb-4"><span className="text-xs text-white/60">Recibo #{receiptId}</span><strong className="text-2xl">{formatCop(result?.monto ?? amount)}</strong></div>
      {result ? <div role="status" className="space-y-4"><h3 className="text-xl">{result.estado === 'completado' ? 'Simulación aprobada' : result.estado === 'anulado' ? 'Simulación rechazada' : 'Simulación pendiente'}</h3><p className="break-all font-mono text-xs text-white/70">{result.referencia}</p><p className="text-sm text-white/60">{result.estado === 'completado' ? 'El recibo quedó pagado en la aplicación.' : 'El recibo sigue pendiente. No se ha realizado ningún cobro.'}</p><p className="text-xs font-bold text-amber-200">COMPROBANTE SIMULADO · SIN VALOR COMO PAGO REAL</p><button type="button" onClick={onClose} className="rounded bg-red-600 px-5 py-3 text-sm">Cerrar</button></div> : <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy || submitted} className="space-y-4 disabled:opacity-70"><legend className="mb-3 text-xs text-white/70">Método de prueba</legend>
          <div className="grid grid-cols-2 gap-3">{['tarjeta', 'nequi'].map((value) => <button key={value} type="button" aria-pressed={method === value} onClick={() => setMethod(value)} className={`rounded-lg border p-3 text-sm ${method === value ? 'border-red-400 bg-red-950/40' : 'border-white/15'}`}>{value === 'tarjeta' ? 'Tarjeta de prueba' : 'Nequi simulado'}</button>)}</div>
          {method === 'tarjeta' ? <>
            <div className="rounded-2xl border border-red-400/25 bg-gradient-to-br from-red-950 to-zinc-950 p-6"><div className="flex h-10 items-center justify-between"><span className="text-[10px] tracking-widest text-white/50">DEMOSTRACIÓN</span><BrandLogo brand={brand} /></div><p className="mt-8 font-mono text-lg tracking-widest">{number || '•••• •••• •••• ••••'}</p><p className="mt-4 font-mono text-xs text-white/55">TITULAR FICTICIO <span className="float-right">{expiry || 'MM/AA'}</span></p></div>
            <div className="flex flex-wrap gap-2">{Object.entries(TEST_CARDS).map(([name, value]) => <button key={name} type="button" onClick={() => setNumber(formatCard(value))} className="rounded border border-white/15 px-3 py-2 text-xs">{name === 'amex' ? 'American Express' : name === 'visa' ? 'Visa' : 'Mastercard'} de prueba</button>)}</div>
            <label className="grid gap-1 text-xs text-white/65">Número ficticio (solo las opciones indicadas)<input required autoComplete="off" inputMode="numeric" value={number} onChange={(event) => setNumber(formatCard(event.target.value))} className={inputClass} /></label>
            <div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-xs text-white/65">Vencimiento de prueba<input required autoComplete="off" placeholder="MM/AA" maxLength={5} value={expiry} onChange={(event) => setExpiry(event.target.value)} className={inputClass} /></label><label className="grid gap-1 text-xs text-white/65">Código ficticio<input required type="password" autoComplete="off" inputMode="numeric" maxLength={4} value={cvv} onChange={(event) => setCvv(event.target.value.replace(/\D/g, ''))} className={inputClass} /></label></div>
          </> : <label className="grid gap-2 text-xs text-white/65"><span className="text-2xl font-black text-pink-300">Nequi · SIMULADO</span>Celular ficticio<input value={phone} inputMode="numeric" onChange={(event) => setPhone(event.target.value)} className={inputClass} /><span>Utiliza 3000000000. No se enviarán solicitudes de cobro.</span></label>}
          <label className="grid gap-2 text-xs text-white/65">Resultado del simulador<select value={outcome} onChange={(event) => setOutcome(event.target.value)} className={inputClass}><option value="aprobado">Aprobado</option><option value="rechazado">Rechazado</option><option value="pendiente">Pendiente</option></select></label>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-red-600 p-4 text-sm font-semibold disabled:opacity-50">{busy ? 'Procesando simulación…' : submitted ? 'Reintentar la misma simulación' : 'Simular pago · sin dinero real'}</button>
      </form>}
    </section>
  </div>
}
