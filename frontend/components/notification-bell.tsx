// TODO: futura integración con servicios de Google
// La lógica de notificaciones está separada de cualquier integración externa de Google.

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Bell, CheckCheck, X, ChevronDown } from 'lucide-react'
import { getApiUrl } from '@/lib/config'

const apiUrl = getApiUrl('')

type Notificacion = {
  id: number
  titulo: string
  mensaje: string
  tipo: string
  tipo_label: string
  leida: boolean
  link: string | null
  created_at: string
}

export default function NotificationBell() {
  const [noLeidas, setNoLeidas] = useState(0)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''

  const fetchNoLeidas = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${apiUrl}/api/notificaciones/no-leidas/count`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setNoLeidas(data.no_leidas || 0)
      }
    } catch {
      // Silently ignore
    }
  }, [token])

  const fetchNotificaciones = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${apiUrl}/api/notificaciones?per_page=10`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setNotificaciones(data.data || [])
      }
    } catch {
      // Silently ignore
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchNoLeidas()
      fetchNotificaciones()
    }
  }, [token, fetchNoLeidas, fetchNotificaciones])

  useEffect(() => {
    if (!token) return
    const interval = setInterval(() => {
      fetchNoLeidas()
      if (abierto) fetchNotificaciones()
    }, 30000)
    return () => clearInterval(interval)
  }, [token, abierto, fetchNoLeidas])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleMarcarComoLeida(id: number) {
    try {
      await fetch(`${apiUrl}/api/notificaciones/${id}/leer`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      await fetchNoLeidas()
      await fetchNotificaciones()
    } catch {
      // Silently ignore
    }
  }

  async function handleMarcarTodasComoLeidas() {
    try {
      await fetch(`${apiUrl}/api/notificaciones/marcar-todas-leidas`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      await fetchNoLeidas()
      await fetchNotificaciones()
    } catch {
      // Silently ignore
    }
  }

  function handleClickNotificacion(notificacion: Notificacion) {
    if (!notificacion.leida) {
      handleMarcarComoLeida(notificacion.id)
    }
    if (notificacion.link) {
      window.location.href = notificacion.link
    }
    setAbierto(false)
  }

  return (
    // TODO: futura integración con servicios de Google
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto(!abierto)}
        className="relative p-2 text-primary-foreground/70 hover:text-accent transition"
        aria-label="Notificaciones"
      >
        <Bell size={22} />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 border border-primary-foreground/15 bg-primary rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary-foreground/10">
            <h3 className="font-serif text-sm text-primary-foreground">Notificaciones</h3>
            {noLeidas > 0 && (
              <button
                onClick={handleMarcarTodasComoLeidas}
                className="text-[10px] text-accent hover:text-accent-foreground transition font-medium flex items-center gap-1"
              >
                <CheckCheck size={12} /> Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Bell className="text-primary-foreground/10 mb-2" size={32} />
                <p className="text-primary-foreground/40 text-xs">No tienes notificaciones</p>
              </div>
            ) : (
              notificaciones.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClickNotificacion(notif)}
                  className={`w-full text-left px-4 py-3 border-b border-primary-foreground/5 hover:bg-primary-foreground/5 transition ${
                    notif.leida ? 'bg-transparent' : 'bg-accent/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${notif.leida ? 'bg-primary-foreground/20' : 'bg-accent'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${notif.leida ? 'text-primary-foreground/50' : 'text-primary-foreground'}`}>
                        {notif.titulo}
                      </p>
                      <p className="text-[11px] text-primary-foreground/40 mt-0.5 line-clamp-2">
                        {notif.mensaje}
                      </p>
                      <time className="text-[10px] text-primary-foreground/30 mt-1 block">
                        {new Date(notif.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </time>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-primary-foreground/10">
            <a
              href="/notificaciones"
              className="text-[10px] text-accent hover:text-accent-foreground transition text-center block"
              onClick={() => setAbierto(false)}
            >
              Ver todas las notificaciones
            </a>
          </div>
        </div>
      )}
    </div>
  )
}