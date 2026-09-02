// TODO: futura integración con servicios de Google
// La lógica de notificaciones administrativas está separada de cualquier integración externa de Google.

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Send, Bell, Inbox, AlertTriangle, Package, Truck, Navigation, Wrench, Info, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '@/lib/config'

const apiUrl = getApiUrl('')

const TIPO_ICONS: Record<string, React.ElementType> = {
  estado_vehiculo: Truck,
  diagnostico: Wrench,
  reparacion_necesaria: AlertTriangle,
  reparacion_en_proceso: Navigation,
  reparacion_finalizada: Package,
  vehiculo_listo: Package,
  observacion: MessageCircle,
  info_general: Info,
}

const TIPOS_DISPONIBLES = [
  { value: 'estado_vehiculo', label: 'Estado del vehículo' },
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'reparacion_necesaria', label: 'Reparación necesaria' },
  { value: 'reparacion_en_proceso', label: 'Reparación en proceso' },
  { value: 'reparacion_finalizada', label: 'Reparación finalizada' },
  { value: 'vehiculo_listo', label: 'Vehículo listo' },
  { value: 'observacion', label: 'Observación' },
  { value: 'info_general', label: 'Información general' },
]

type Usuario = {
  id: number
  nombre: string
  apellido: string
  email: string
  rol: string
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

export default function AdminNotificacionesPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [usuarioId, setUsuarioId] = useState('')
  const [tipo, setTipo] = useState('')
  const [titulo, setTitulo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [verTodas, setVerTodas] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''

  useEffect(() => {
    if (!token) {
      router.push('/sign-in')
      return
    }
    fetch(`${apiUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error()
        const data = await r.json()
        if (data.user?.rol !== 'admin') {
          router.push('/')
        }
      })
      .catch(() => {
        localStorage.removeItem('jenna_car_token')
        localStorage.removeItem('jenna_car_user')
        router.push('/sign-in')
      })
  }, [token, router])

  const fetchDatos = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUsuarios(data.data || [])
      }
    } catch {
      // Silently ignore
    }
    try {
      const params = verTodas ? '' : '?no_leidas=true'
      const res = await fetch(`${apiUrl}/api/admin/notificaciones${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setNotificaciones(data.data || [])
      }
    } catch {
      // Silently ignore
    }
  }, [token, verTodas])

  useEffect(() => {
    fetchDatos()
    setLoading(false)
  }, [fetchDatos])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!usuarioId || !tipo || !titulo || !mensaje) {
      setError('Todos los campos son obligatorios')
      return
    }

    setEnviando(true)
    try {
      const payload: any = { tipo, titulo, mensaje, usuario_id: Number(usuarioId) }

      const res = await fetch(`${apiUrl}/api/admin/notificaciones`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al enviar la notificación')
      }
      setSuccess('Notificación enviada correctamente')
      setTitulo('')
      setMensaje('')
      setTipo('')
      setUsuarioId('')
      await fetchDatos()
    } catch (err: any) {
      setError(err.message || 'Error al enviar la notificación')
    } finally {
      setEnviando(false)
    }
  }

  if (!token) return null

  return (
    // TODO: futura integración con servicios de Google
    <main className="min-h-screen bg-primary text-primary-foreground">
      <header className="border-b border-primary-foreground/10 bg-primary/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="text-accent" size={24} />
            <h1 className="font-serif text-2xl tracking-[0.18em]">Notificaciones · Admin</h1>
          </div>
          <a href="/admin/dashboard" className="text-xs text-primary-foreground/50 hover:text-primary-foreground transition">← Panel</a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8 grid lg:grid-cols-5 gap-8">
        {/* Formulario de envío */}
        <div className="lg:col-span-2">
          <h2 className="font-serif text-xl mb-6 flex items-center gap-2">
            <Send size={20} className="text-accent" />
            Enviar notificación
          </h2>
          {error && (
            <div className="mb-4 p-3 border border-red-500/30 bg-red-500/10 rounded text-sm text-red-400">{error}</div>
          )}
          {success && (
            <div className="mb-4 p-3 border border-green-500/30 bg-green-500/10 rounded text-sm text-green-400">{success}</div>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <label className="block text-xs text-primary-foreground/50 mb-1">Usuario *</label>
              <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} required className="w-full border border-primary-foreground/20 bg-primary px-3 py-2 text-sm text-primary-foreground outline-none focus:border-accent rounded">
                <option value="">Seleccionar usuario</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre} {u.apellido} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-primary-foreground/50 mb-1">Tipo de notificación *</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} required className="w-full border border-primary-foreground/20 bg-primary px-3 py-2 text-sm text-primary-foreground outline-none focus:border-accent rounded">
                <option value="">Seleccionar tipo</option>
                {TIPOS_DISPONIBLES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-primary-foreground/50 mb-1">Título *</label>
              <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="w-full border border-primary-foreground/20 bg-primary px-3 py-2 text-sm text-primary-foreground outline-none focus:border-accent rounded" placeholder="Ej: Reparación recomendada" />
            </div>
            <div>
              <label className="block text-xs text-primary-foreground/50 mb-1">Mensaje *</label>
              <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} required rows={4} className="w-full border border-primary-foreground/20 bg-primary px-3 py-2 text-sm text-primary-foreground outline-none focus:border-accent rounded" placeholder="Descripción de la notificación..." />
            </div>
            <button type="submit" disabled={enviando} className="flex items-center justify-center gap-2 bg-accent px-4 py-3 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition disabled:opacity-50">
              {enviando ? <><span className="animate-spin">⟳</span> Enviando...</> : <><Send size={16} /> Enviar notificación</>}
            </button>
          </form>
        </div>

        {/* Lista de notificaciones */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl flex items-center gap-2">
              <Inbox size={20} className="text-accent" />
              Notificaciones enviadas
            </h2>
            <button onClick={() => setVerTodas(!verTodas)} className={`text-xs px-3 py-2 border rounded transition ${verTodas ? 'border-accent bg-accent/20 text-accent-foreground' : 'border-primary-foreground/20 text-primary-foreground/60'}`}>
              {verTodas ? 'Mostrar solo no leídas' : 'Mostrar todas'}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-primary-foreground/40 text-sm">Cargando...</span>
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className="text-primary-foreground/10 mb-3" size={36} />
              <p className="text-primary-foreground/40 text-sm">No hay notificaciones para mostrar.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {notificaciones.map((notif) => {
                const IconComponent = TIPO_ICONS[notif.tipo] || Info
                return (
                  <article key={notif.id} className={`border rounded-lg p-4 ${notif.leida ? 'border-primary-foreground/10 bg-primary/50' : 'border-accent/30 bg-accent/5'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 p-1.5 rounded-full ${notif.leida ? 'bg-primary-foreground/10 text-primary-foreground/30' : 'bg-accent/20 text-accent'}`}>
                        <IconComponent size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary-foreground/80">{notif.titulo}</span>
                          {!notif.leida && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-primary-foreground/50 mt-1 line-clamp-2">{notif.mensaje}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-primary-foreground/30">
                          <span className="px-1.5 py-0.5 bg-primary-foreground/10 rounded">{notif.tipo_label}</span>
                          <span>{new Date(notif.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}