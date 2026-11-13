import { useState } from 'react'
import { CircleDollarSign } from 'lucide-react'
import { formatCop } from '@/lib/utils'
import type { DashboardData } from './dashboardTypes'

export default function DashboardActivity({ dashboard }: { dashboard: DashboardData }) {
  const [activeTab, setActiveTab] = useState<'citas' | 'ordenes' | 'pagos'>('citas')

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
<section className="rounded-2xl border border-red-900/40 bg-[#151515] overflow-hidden">
                <div className="flex flex-col justify-between border-b border-red-900/40 bg-black/40 p-6 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400">
                      Flujo de Trabajo Reciente
                    </p>
                    <h2 className="mt-1 font-serif text-2xl text-white">Actividad reciente</h2><p className="mt-2 text-xs text-white/55">{dashboard.citas_hoy} citas para hoy · {dashboard.recibos_pagados} recibos pagados</p>
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
                                  {order.vehiculo} · <span className="font-mono text-emerald-400">{formatCop(order.total)}</span>
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
                              +{formatCop(payment.monto)}
                            </span>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              </section>
  )
}
