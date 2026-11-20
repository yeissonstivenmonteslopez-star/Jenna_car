import { useEffect, useState } from 'react'
import { fleetRequest } from './fleetApi'

interface Inbox {
  data: { id: number; titulo: string; mensaje: string; leida: boolean }[]
  pendientes: number
  paginas: number
}

export default function FleetInbox({ token }: { token: string }) {
  const [inbox, setInbox] = useState<Inbox>()
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const data = await fleetRequest<Inbox>('convenios/notificaciones?page=' + page, token)
        if (active) { setInbox(data); setError('') }
      } catch { if (active) setError('No se pudieron consultar los avisos.') }
    }
    void load()
    const timer = window.setInterval(load, 30000)
    return () => { active = false; window.clearInterval(timer) }
  }, [token, page, refresh])
  async function read(id?: number) {
    try {
      await fleetRequest('convenios/notificaciones', token, id ? { id } : { todas: true })
      setRefresh(value => value + 1)
    } catch { setError('No se pudo actualizar el aviso.') }
  }
  return <details className="rounded-xl border border-white/20 p-4">
    <summary className="cursor-pointer">Notificaciones {inbox && <span>· {inbox.pendientes} sin leer</span>}</summary>
    {error && <p role="alert">{error}</p>}
    {inbox && <div className="mt-3 grid gap-3">
      {inbox.pendientes > 0 && <button onClick={() => read()}>Marcar todas como leídas</button>}
      {!inbox.data.length && <p>No hay avisos de flota.</p>}
      {inbox.data.map(n => <article key={n.id} className="border-t border-white/20 py-2">
        <strong>{n.titulo}</strong><p>{n.mensaje}</p>
        {!n.leida && <button className="underline" onClick={() => read(n.id)}>Marcar como leída</button>}
      </article>)}
      {page > 1 && <button onClick={() => setPage(page - 1)}>Anterior</button>}
      {page < inbox.paginas && <button onClick={() => setPage(page + 1)}>Siguiente</button>}
    </div>}
  </details>
}
