import DashboardActivity from './DashboardActivity'
import type { DashboardData } from './dashboardTypes'

import { useCallback, useEffect, useState } from 'react'
import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  RefreshCw,
  Users,
  Wrench,
} from 'lucide-react'
import { getAdminDashboard } from '@/features/auth/services/authService'
import { formatCop } from '@/lib/utils'

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
  { label: 'Citas pendientes', key: 'citas_pendientes', icon: CalendarDays, href: '/admin/citas', accent: 'text-red-400' },
  { label: 'Órdenes en reparación', key: 'ordenes_reparacion', icon: Wrench, href: '/admin/orders', accent: 'text-red-400' },
  { label: 'Recibos pendientes', key: 'recibos_pendientes', icon: CircleDollarSign, href: '/admin/orders', accent: 'text-red-400' },
  { label: 'Ingresos totales', key: 'ingresos_totales', icon: CircleDollarSign, href: '/admin/orders', accent: 'text-red-400', isCurrency: true },
]

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

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
      const data = await getAdminDashboard(token)
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


  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 lg:px-10 lg:py-12">
        {/* ── Título y Acciones Superiores ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400">
              Resumen Operativo del Taller
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-white lg:text-5xl">Resumen del taller</h1>
            <p className="mt-2 text-sm text-white/60">
              Agenda, reparaciones y cobros en un solo lugar.
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
          </div>
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
                <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Resumen operativo</h2>
              </div>
              <div className="dashboard-metrics">
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
                            ? formatCop(numValue)
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
            <div className="grid gap-6">
              {/* Columna Izquierda: Actividad Reciente Multitab */}
              <DashboardActivity dashboard={dashboard} />


            </div>
          </>
        )}
      </div>
    </main>
  )
}
