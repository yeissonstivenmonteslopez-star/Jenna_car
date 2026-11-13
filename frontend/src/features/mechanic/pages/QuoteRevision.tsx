import { useState } from 'react'
import { authHeaders, getApiUrl, handleResponse } from '@/services/apiClient'
import { formatCop } from '@/lib/utils'

export default function QuoteRevision({ order, token, onSaved }: {
  order: { id: number; subtotal: number; total: number }; token: string; onSaved: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [total, setTotal] = useState(String(order.total))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <section className="grid gap-3 rounded border border-red-500/40 p-4" aria-label={`Cotización rechazada de la orden ${order.id}`}>
    <p className="text-sm font-semibold">El cliente ha rechazado la cotización de la orden #{order.id}.</p>
    {!editing ? <button type="button" onClick={() => setEditing(true)} className="justify-self-start rounded bg-red-600 px-4 py-2 text-sm text-white">Enviar otra cotización</button> : <form className="grid gap-3" onSubmit={async (event) => {
      event.preventDefault()
      if (busy) return
      setBusy(true); setError('')
      try {
        const response = await fetch(getApiUrl(`/api/mechanic/orders/${order.id}/revise-quote`), {
          method: 'POST', headers: { ...authHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ total }),
        })
        await handleResponse(response, 'No se pudo enviar la cotización.')
        await onSaved()
      } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo enviar.') }
      finally { setBusy(false) }
    }}>
      <p className="text-xs text-white/65">Aplica un descuento sobre {formatCop(order.subtotal)}. Se conservan los servicios, los trabajos y las fotografías.</p>
      <label className="grid gap-2 text-sm">Nuevo total (COP)<input required type="number" min="0.01" max={order.subtotal} step="0.01" value={total} disabled={busy} onChange={(event) => setTotal(event.target.value)} className="rounded border border-white/15 px-3 py-2" /></label>
      <div className="flex gap-3"><button disabled={busy} className="rounded bg-red-600 px-4 py-2 text-sm text-white">{busy ? 'Enviando…' : 'Enviar al cliente'}</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>Cancelar</button></div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </form>}
  </section>
}
