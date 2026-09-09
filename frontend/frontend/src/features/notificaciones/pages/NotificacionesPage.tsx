// TODO: futura integración con servicios de Google
// La lógica de notificaciones está separada de cualquier integración externa de Google.


import { useEffect, useState, useCallback } from 'react'
import { Bell, CheckCheck, Loader2, AlertCircle, Truck, Wrench, AlertTriangle, Package, MessageCircle, Info, Navigation } from 'lucide-react'
import { getNotificaciones, marcarLeida, marcarTodasLeidas } from '@/features/notificaciones/services/notificacionesService'
import { ApiError } from '@/services/apiClient'

const TIPO_ICONS: Record<string, React.ElementType> = {
  estado_vehiculo: Truck,
  diagnostico: Wrench,
  reparacion_necesaria: AlertTriangle,
  reparacion_en_proceso: Navigation,
  reparacion_finalizada: Package,
  vehiculo_listo: Package,
  observacion: MessageCircle,
  info_general: Info,
  cita: Navigation,
  pago: Package,
  sistema: Info,
}

function getNotificationLink(link: string | null) {
  if (!link) return null
  if (link.startsWith('/citas/')) return '/mis-citas'
  if (link.startsWith('/recibos/') || link.startsWith('/ordenes/')) return '/mis-recibos'
  return link
}

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

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [marcando, setMarcando] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [token] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''))

  const fetchNotificaciones = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getNotificaciones({ page, per_page: 20 }, token)
      setNotificaciones(data.data || [])
      setTotalPages((data as { total_pages?: number }).total_pages || 1)
    } catch (err: unknown) {
      const apiErr = err as ApiError
      if (apiErr.status === 401) {
        localStorage.removeItem('jenna_car_token')
        localStorage.removeItem('jenna_car_user')
        window.location.href = '/sign-in'
        return
      }
      setError((err as Error).message || 'Error al cargar las notificaciones')
    } finally {
      setLoading(false)
    }
  }, [token, page])

  useEffect(() => {
    if (token) {
      fetchNotificaciones()
    } else {
      setLoading(false)
    }
  }, [token, fetchNotificaciones])

  async function handleMarcarComoLeida(id: number) {
    try {
      await marcarLeida(id, token)
      await fetchNotificaciones()
    } catch {
      setError('Error al marcar como leída')
    }
  }

  async function handleMarcarTodasComoLeidas() {
    setMarcando(true)
    try {
      await marcarTodasLeidas(token)
      await fetchNotificaciones()
    } catch {
      setError('Error al marcar todas como leídas')
    } finally {
      setMarcando(false)
    }
  }

  const noLeidasCount = notificaciones.filter((n) => !n.leida).length

  if (!token) {
    return (
      <main className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <Bell className="mx-auto mb-4 text-accent" size={48} />
          <h1 className="font-serif text-3xl text-primary-foreground mb-4">Notificaciones</h1>
          <p className="text-primary-foreground/60">Debes iniciar sesión para ver tus notificaciones.</p>
          <a href="/sign-in" className="mt-4 inline-block px-6 py-3 bg-accent text-accent-foreground text-sm font-medium tracking-[0.18em]">INICIAR SESIÓN</a>
        </div>
      </main>
    )
  }

  return (
    // TODO: futura integración con servicios de Google
    <main className="min-h-screen bg-primary text-primary-foreground">
      <header className="border-b border-primary-foreground/10 bg-primary/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="text-accent" size={24} />
            <h1 className="font-serif text-2xl tracking-[0.18em]">Notificaciones</h1>
            {noLeidasCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider bg-accent text-accent-foreground rounded-full">
                {noLeidasCount} nuevas
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {noLeidasCount > 0 && (
              <button
                onClick={handleMarcarTodasComoLeidas}
                disabled={marcando}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium border border-primary-foreground/20 rounded hover:bg-primary-foreground/10 transition disabled:opacity-50"
              >
                {marcando ? <Loader2 className="animate-spin" size={14} /> : <CheckCheck size={14} />}
                {marcando ? 'Marcando...' : 'Marcar todas como leídas'}
              </button>
            )}
            <a href="/" className="text-xs text-primary-foreground/50 hover:text-primary-foreground transition">← Inicio</a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-8">
        {error && (
          <div className="flex items-center gap-3 mb-6 p-4 border border-red-500/30 bg-red-500/10 rounded text-sm text-red-400">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-accent" size={36} />
            <p className="mt-4 text-primary-foreground/50 text-sm">Cargando notificaciones...</p>
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell className="text-primary-foreground/20 mb-4" size={48} />
            <h2 className="font-serif text-xl text-primary-foreground">No tienes notificaciones nuevas.</h2>
            <p className="mt-2 text-primary-foreground/40 text-sm">Cuando recibas una notificación aparecerá aquí.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs text-primary-foreground/50">{notificaciones.filter(n => !n.leida).length} notificaciones nuevas</p>
            </div>

            <div className="grid gap-4">
              {notificaciones.map((notif) => {
                const IconComponent = TIPO_ICONS[notif.tipo] || Info
                return (
                  <article
                    key={notif.id}
                    className={`border rounded-lg p-6 transition hover:border-accent/40 ${
                      notif.leida
                        ? 'border-primary-foreground/10 bg-primary/50'
                        : 'border-accent/30 bg-accent/5'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 p-2 rounded-full ${notif.leida ? 'bg-primary-foreground/10 text-primary-foreground/40' : 'bg-accent/20 text-accent'}`}>
                        <IconComponent size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className={`font-semibold text-sm ${notif.leida ? 'text-primary-foreground/60' : 'text-primary-foreground'}`}>
                              {notif.titulo}
                            </h3>
                            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium tracking-wider bg-primary-foreground/10 text-primary-foreground/50 rounded">
                              {notif.tipo_label}
                            </span>
                          </div>
                          {!notif.leida && (
                            <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-accent mt-2" />
                          )}
                        </div>
                        <p className={`mt-3 text-sm leading-relaxed ${notif.leida ? 'text-primary-foreground/40' : 'text-primary-foreground/70'}`}>
                          {notif.mensaje}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <time className="text-[11px] text-primary-foreground/30">
                            {new Date(notif.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} · {new Date(notif.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </time>
                          {!notif.leida && (
                            <button
                              onClick={() => handleMarcarComoLeida(notif.id)}
                              className="text-[11px] text-accent hover:text-accent-foreground transition font-medium"
                            >
                              Marcar como leída
                            </button>
                          )}
                        </div>
                        {getNotificationLink(notif.link) && (
                          <a
                            href={getNotificationLink(notif.link) || '#'}
                            className="mt-2 inline-block text-[11px] text-accent hover:text-accent-foreground transition font-medium"
                            onClick={() => handleMarcarComoLeida(notif.id)}
                          >
                            Ir al detalle →
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-2 text-xs border border-primary-foreground/20 rounded hover:bg-primary-foreground/10 disabled:opacity-30 transition"
                >
                  Anterior
                </button>
                <span className="text-xs text-primary-foreground/50">Página {page} de {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-2 text-xs border border-primary-foreground/20 rounded hover:bg-primary-foreground/10 disabled:opacity-30 transition"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}