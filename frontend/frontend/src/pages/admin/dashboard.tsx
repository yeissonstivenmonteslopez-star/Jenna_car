
import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  LogOut,
  RefreshCw,
  Search,
  Users,
  Wrench,
} from 'lucide-react'
import { getApiUrl } from '@/lib/config'

const apiUrl = getApiUrl('')

type AppointmentItem = {
  id: number
  fecha?: string
  hora: string
  cliente: string
  vehiculo: string
  servicio: string
  estado: string
}

type OrderItem = {
  id: number
  cliente: string
  vehiculo: string
  estado: string
  total: number
  fecha_ingreso: string
}

type PaymentItem = {
  id: number
  referencia: string
  cliente: string
  metodo_pago: string
  monto: number
  fecha_pago: string
}

type DashboardData = {
  usuarios: number
  clientes: number
  vehiculos: number
  citas_pendientes: number
  citas_hoy: number
  ordenes_pendientes: number
  ordenes_reparacion: number
  ordenes_terminadas: number
  recibos_pendientes: number
  recibos_pagados: number
  ingresos_totales: number
  citas_recientes: AppointmentItem[]
  ordenes_recientes?: OrderItem[]
  pagos_recientes?: PaymentItem[]
}

type MetricCardKey = 'usuarios' | 'clientes' | 'vehiculos' | 'citas_pendientes' | 'ordenes_pendientes' | 'ordenes_reparacion' | 'ordenes_terminadas' | 'recibos_pendientes' | 'ingresos_totales'

type MetricCardItem = {
  label: string
  key: MetricCardKey
  icon: typeof Users
  href: string
  accent: string
  isCurrency?: boolean
}

const metricCards: MetricCardItem[] = [
  { label: 'Usuarios totales', key: 'usuarios', icon: Users, href: '/admin/users', accent: 'text-blue-400' },
  { label: 'Clientes registrados', key: 'clientes', icon: Users, href: '/admin/users', accent: 'text-indigo-400' },
  { label: 'Vehículos registrados', key: 'vehiculos', icon: Car, href: '/admin/vehiculos', accent: 'text-emerald-400' },
  { label: 'Citas pendientes', key: 'citas_pendientes', icon: CalendarDays, href: '/admin/citas', accent: 'text-amber-400' },
  { label: 'Órdenes pendientes', key: 'ordenes_pendientes', icon: ClipboardList, href: '/admin/orders', accent: 'text-orange-400' },
  { label: 'Órdenes en reparación', key: 'ordenes_reparacion', icon: Wrench, href: '/admin/orders', accent: 'text-purple-400' },
  { label: 'Órdenes terminadas', key: 'ordenes_terminadas', icon: CheckCircle2, href: '/admin/orders', accent: 'text-teal-400' },
  { label: 'Recibos pendientes', key: 'recibos_pendientes', icon: CreditCard, href: '/admin/orders', accent: 'text-red-400' },
  { label: 'Ingresos totales', key: 'ingresos_totales', icon: CircleDollarSign, href: '/admin/orders', accent: 'text-green-400', isCurrency: true },
]

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'citas' | 'ordenes' | 'pagos'>('citas')

  const fetchDashboardData = useCallback(async () => {
    const token = localStorage.getItem('jenna_car_token') || ''
    if (!token) {
      setError('Debes iniciar sesión como administrador.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${apiUrl}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        throw new Error('No fue posible cargar los datos reales del dashboard.')
      }
      const data = await response.json()
      setDashboard(data.data)
      setLastUpdated(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Error al conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  function getStatusBadge(estado: string) {
    const normalized = (estado || '').toLowerCase()
    switch (normalized) {
      case 'pendiente':
        return 'border-amber-500/40 bg-amber-950/40 text-amber-300'
      case 'confirmada':
      case 'en_diagnostico':
        return 'border-blue-500/40 bg-blue-950/40 text-blue-300'
      case 'en_reparacion':
        return 'border-purple-500/40 bg-purple-950/40 text-purple-300'
      case 'atendida':
      case 'terminada':
      case 'entregada':
      case 'pagado':
      case 'completado':
        return 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
      case 'cancelada':
      case 'anulado':
        return 'border-red-500/40 bg-red-950/40 text-red-300'
      default:
        return 'border-white/20 bg-white/5 text-white/70'
    }
  }

  function formatStatusLabel(estado: string) {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      confirmada: 'Confirmada',
      atendida: 'Atendida',
      cancelada: 'Cancelada',
      en_diagnostico: 'En Diagnóstico',
      en_reparacion: 'En Reparación',
      terminada: 'Terminada',
      entregada: 'Entregada',
      pagado: 'Pagado',
      completado: 'Completado',
    }
    return labels[estado.toLowerCase()] || estado
  }

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      {/* ── Encabezado ── */}
      <header className="border-b border-red-900/40 bg-black px-6 py-5 text-white lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="font-serif text-xl tracking-[0.18em]">
            JENNA <span className="text-red-500">CAR</span>
          </a>
          <div className="flex items-center gap-6">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">
              Panel de Administración
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 lg:px-10 lg:py-14">
        {/* ── Título y Acciones Superiores ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400">
              Resumen Operativo del Taller
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-white lg:text-5xl">Dashboard en vivo.</h1>
            <p className="mt-2 text-sm text-white/60">
              Datos operativos reales actualizados directamente desde la base de datos de Jenna Car.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {lastUpdated && (
              <span className="hidden text-xs text-white/40 md:inline">
                Última actualización: <strong className="text-white/70">{lastUpdated}</strong>
              </span>
            )}
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-red-900/50 bg-[#151515] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-red-400 transition hover:border-red-500 hover:bg-[#1f1f1f] disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
            <button
              onClick={() => {
                window.location.replace('/')
              }}
              className="flex items-center gap-2 rounded-xl border border-red-600/40 bg-red-950/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-red-300 transition hover:border-red-500 hover:bg-red-900/50 hover:text-white"
            >
              <LogOut size={14} />
              Salir del panel
            </button>
          </div>
        </div>

        {/* ── Tarjetas de Navegación Rápida a Secciones ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="/admin/servicios"
            className="group rounded-2xl border border-red-900/40 bg-[#151515] p-5 transition hover:border-red-500/70 hover:bg-[#1b1b1b]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-400">Catálogo</span>
              <Wrench size={18} className="text-white/40 group-hover:text-red-400" />
            </div>
            <h2 className="mt-3 font-serif text-2xl text-white">Servicios</h2>
            <p className="mt-1 text-xs text-white/60">Gestiona precios, tiempos y catálogo preventivo.</p>
          </a>

          <a
            href="/admin/orders"
            className="group rounded-2xl border border-red-900/40 bg-[#151515] p-5 transition hover:border-red-500/70 hover:bg-[#1b1b1b]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-400">Operación</span>
              <ClipboardList size={18} className="text-white/40 group-hover:text-red-400" />
            </div>
            <h2 className="mt-3 font-serif text-2xl text-white">Órdenes de Trabajo</h2>
            <p className="mt-1 text-xs text-white/60">Crea órdenes, asigna diagnósticos y genera cobros.</p>
          </a>

          <a
            href="/admin/citas"
            className="group rounded-2xl border border-red-900/40 bg-[#151515] p-5 transition hover:border-red-500/70 hover:bg-[#1b1b1b]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-400">Agenda</span>
              <CalendarDays size={18} className="text-white/40 group-hover:text-red-400" />
            </div>
            <h2 className="mt-3 font-serif text-2xl text-white">Citas Programadas</h2>
            <p className="mt-1 text-xs text-white/60">Revisa la disponibilidad y confirma reservas.</p>
          </a>

          <a
            href="/admin/users"
            className="group rounded-2xl border border-red-900/40 bg-[#151515] p-5 transition hover:border-red-500/70 hover:bg-[#1b1b1b]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-400">Seguridad</span>
              <Users size={18} className="text-white/40 group-hover:text-red-400" />
            </div>
            <h2 className="mt-3 font-serif text-2xl text-white">Usuarios y Roles</h2>
            <p className="mt-1 text-xs text-white/60">Administra cuentas y permisos de personal.</p>
          </a>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/50 bg-red-950/40 p-5 text-sm text-red-200">
            <p className="font-semibold">{error}</p>
            <button onClick={fetchDashboardData} className="mt-3 text-xs font-semibold text-red-400 underline">
              Reintentar carga de datos
            </button>
          </div>
        )}

        {loading && !dashboard && (
          <div className="flex items-center justify-center gap-3 py-16 text-white/60">
            <RefreshCw size={20} className="animate-spin text-red-500" />
            <span className="text-sm">Cargando métricas reales del servidor...</span>
          </div>
        )}

        {dashboard && (
          <>
            {/* ── Rejilla Principal de Métricas Operativas ── */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Indicadores Clave de Desempeño (KPIs)</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {metricCards.map(({ label, key, icon: Icon, href, accent, isCurrency }) => {
                  const val = dashboard[key as keyof DashboardData]
                  const numValue = typeof val === 'number' ? val : 0

                  return (
                    <a
                      key={key}
                      href={href}
                      className="group flex flex-col justify-between rounded-2xl border border-red-900/30 bg-[#151515] p-6 transition hover:border-red-500/60 hover:bg-[#1a1a1a]"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60">
                          {label}
                        </p>
                        <div className="rounded-xl border border-white/10 bg-black/40 p-2.5 transition group-hover:border-red-500/40">
                          <Icon size={18} className={accent} />
                        </div>
                      </div>
                      <div className="mt-6 flex items-baseline justify-between">
                        <p className="font-serif text-3xl text-white">
                          {isCurrency
                            ? `$${numValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : numValue.toLocaleString('es-ES')}
                        </p>
                        <span className="flex items-center text-[10px] uppercase tracking-wider text-white/40 group-hover:text-red-400">
                          Ver <ChevronRight size={12} />
                        </span>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>

            {/* ── Actividad Reciente y Estado del Día ── */}
            <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
              {/* Columna Izquierda: Actividad Reciente Multitab */}
              <section className="rounded-2xl border border-red-900/40 bg-[#151515] overflow-hidden">
                <div className="flex flex-col justify-between border-b border-red-900/40 bg-black/40 p-6 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400">
                      Flujo de Trabajo Reciente
                    </p>
                    <h2 className="mt-1 font-serif text-2xl text-white">Actividad en tiempo real</h2>
                  </div>

                  {/* Selector de pestañas */}
                  <div className="mt-4 flex rounded-xl border border-red-900/40 bg-[#111] p-1 sm:mt-0">
                    <button
                      onClick={() => setActiveTab('citas')}
                      className={`px-3 py-1.5 text-xs font-medium transition rounded-lg ${
                        activeTab === 'citas'
                          ? 'bg-red-600 text-white shadow'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Citas ({dashboard.citas_recientes?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab('ordenes')}
                      className={`px-3 py-1.5 text-xs font-medium transition rounded-lg ${
                        activeTab === 'ordenes'
                          ? 'bg-red-600 text-white shadow'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Órdenes ({(dashboard.ordenes_recientes || []).length})
                    </button>
                    <button
                      onClick={() => setActiveTab('pagos')}
                      className={`px-3 py-1.5 text-xs font-medium transition rounded-lg ${
                        activeTab === 'pagos'
                          ? 'bg-red-600 text-white shadow'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Pagos ({(dashboard.pagos_recientes || []).length})
                    </button>
                  </div>
                </div>

                {/* Contenido según pestaña */}
                <div className="divide-y divide-red-900/20">
                  {activeTab === 'citas' && (
                    <>
                      {dashboard.citas_recientes.length === 0 ? (
                        <p className="p-8 text-center text-sm text-white/50">No hay citas recientes registradas.</p>
                      ) : (
                        dashboard.citas_recientes.map((appointment) => (
                          <div key={appointment.id} className="flex items-center justify-between p-5 transition hover:bg-black/30">
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-center justify-center rounded-xl border border-red-900/30 bg-black/60 px-3 py-2 text-center min-w-[65px]">
                                <span className="font-mono text-xs font-bold text-red-400">{appointment.hora}</span>
                                {appointment.fecha && <span className="text-[9px] text-white/40">{appointment.fecha}</span>}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{appointment.cliente}</p>
                                <p className="mt-0.5 text-xs text-white/55">
                                  {appointment.vehiculo} · <span className="text-red-300/80">{appointment.servicio}</span>
                                </p>
                              </div>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${getStatusBadge(appointment.estado)}`}>
                              {formatStatusLabel(appointment.estado)}
                            </span>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {activeTab === 'ordenes' && (
                    <>
                      {(!dashboard.ordenes_recientes || dashboard.ordenes_recientes.length === 0) ? (
                        <p className="p-8 text-center text-sm text-white/50">No hay órdenes de trabajo recientes.</p>
                      ) : (
                        dashboard.ordenes_recientes.map((order) => (
                          <div key={order.id} className="flex items-center justify-between p-5 transition hover:bg-black/30">
                            <div className="flex items-center gap-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-900/30 bg-black/60 font-mono text-xs font-bold text-red-400">
                                #{order.id}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{order.cliente}</p>
                                <p className="mt-0.5 text-xs text-white/55">
                                  {order.vehiculo} · <span className="font-mono text-emerald-400">${order.total.toFixed(2)}</span>
                                </p>
                              </div>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${getStatusBadge(order.estado)}`}>
                              {formatStatusLabel(order.estado)}
                            </span>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {activeTab === 'pagos' && (
                    <>
                      {(!dashboard.pagos_recientes || dashboard.pagos_recientes.length === 0) ? (
                        <p className="p-8 text-center text-sm text-white/50">No se registran pagos recientes completados.</p>
                      ) : (
                        dashboard.pagos_recientes.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between p-5 transition hover:bg-black/30">
                            <div className="flex items-center gap-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-400">
                                <CircleDollarSign size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{payment.cliente}</p>
                                <p className="mt-0.5 text-xs text-white/55">
                                  {payment.metodo_pago} · Ref: <span className="font-mono text-white/70">{payment.referencia}</span>
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-base font-bold text-emerald-400">
                              +${payment.monto.toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              </section>

              {/* Columna Derecha: Estado de la Operación del Día */}
              <section className="flex flex-col justify-between rounded-2xl border border-red-900/50 bg-gradient-to-b from-red-950/80 to-[#120506] p-7 text-white shadow-xl">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">
                      Estado Operativo de Hoy
                    </p>
                    <Activity size={18} className="text-red-400 animate-pulse" />
                  </div>
                  <h2 className="mt-3 font-serif text-3xl">Operación Activa.</h2>
                  <p className="mt-2 text-xs text-white/60">
                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>

                  <div className="mt-8 grid gap-4">
                    <div className="rounded-xl border border-red-900/40 bg-black/40 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-white/50">Citas para hoy</p>
                      <p className="mt-1 font-serif text-2xl text-white">{dashboard.citas_hoy} <span className="text-xs text-white/60 font-sans">programadas</span></p>
                    </div>

                    <div className="rounded-xl border border-red-900/40 bg-black/40 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-white/50">Recibos pagados</p>
                      <p className="mt-1 font-serif text-2xl text-emerald-400">{dashboard.recibos_pagados} <span className="text-xs text-white/60 font-sans">transacciones completadas</span></p>
                    </div>

                    <div className="rounded-xl border border-red-900/40 bg-black/40 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-white/50">En taller hoy</p>
                      <p className="mt-1 font-serif text-2xl text-purple-300">{dashboard.ordenes_reparacion} <span className="text-xs text-white/60 font-sans">vehículos en reparación</span></p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-red-900/40 pt-5">
                  <a
                    href="/admin/orders"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-red-500"
                  >
                    <Wrench size={15} /> Nueva Orden de Trabajo
                  </a>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
