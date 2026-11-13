import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  CalendarDays,
  Car,
  ClipboardList,
  Filter,
  LoaderCircle,
  Receipt,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { adminSearch } from '@/features/usuarios/services/usuariosService'

type SearchType = 'all' | 'cliente' | 'vehiculo' | 'orden' | 'cita' | 'recibo'

interface SearchResult {
  id: number
  nombre?: string
  apellido?: string
  documento?: string
  email?: string
  telefono?: string
  marca?: string
  modelo?: string
  placa?: string
  anio?: number
  estado?: string
  cliente?: string
  vehiculo_placa?: string
  fecha?: string
  hora?: string
  orden_id?: number
  fecha_emision?: string
}

interface SearchFilters {
  q: string
  type: SearchType
}

const searchTypes = [
  { value: 'all', label: 'Todo', icon: Search, key: 'all' },
  { value: 'cliente', label: 'Clientes', icon: Users, key: 'clientes' },
  { value: 'vehiculo', label: 'Vehículos', icon: Car, key: 'vehiculos' },
  { value: 'orden', label: 'Órdenes', icon: ClipboardList, key: 'órdenes' },
  { value: 'cita', label: 'Citas', icon: CalendarDays, key: 'citas' },
  { value: 'recibo', label: 'Recibos', icon: Receipt, key: 'recibos' },
] satisfies Array<{ value: SearchType; label: string; icon: typeof Search; key: string }>

const resultGroups = [
  { key: 'clientes', label: 'Clientes', icon: Users, route: '/admin/users' },
  { key: 'vehiculos', label: 'Vehículos', icon: Car, route: '/admin/vehiculos' },
  { key: 'órdenes', label: 'Órdenes de trabajo', icon: ClipboardList, route: '/admin/orders' },
  { key: 'citas', label: 'Citas', icon: CalendarDays, route: '/admin/citas' },
  { key: 'recibos', label: 'Recibos', icon: Receipt, route: '/mis-recibos' },
] satisfies Array<{ key: string; label: string; icon: typeof Search; route: string }>

const quickSuggestions = ['Activo', 'Pendiente', 'Chevrolet', 'Renault', 'Mazda', 'Toyota']

function getStatusStyle(status: string) {
  const normalized = status.toLowerCase()
  if (['activo', 'completada', 'confirmada', 'pagado'].includes(normalized)) {
    return 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
  }
  if (['pendiente', 'en_proceso', 'en_progreso', 'espera'].includes(normalized)) {
    return 'bg-amber-950/40 text-amber-300 border-amber-500/30'
  }
  if (['inactivo', 'cancelada', 'cancelado', 'rechazado'].includes(normalized)) {
    return 'bg-red-950/40 text-red-300 border-red-500/30'
  }
  return 'bg-white/5 text-white/60 border-white/10'
}

export default function AdminSearch() {
  const [filters, setFilters] = useState<SearchFilters>({ q: '', type: 'all' })
  const [token] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''))
  const [results, setResults] = useState<Record<string, SearchResult[]>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(filters.q), 300)
    return () => window.clearTimeout(timeout)
  }, [filters.q])

  useEffect(() => {
    if (!token) {
      window.location.href = '/sign-in'
    }
  }, [token])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFilters((prev) => ({ ...prev, q: '' }))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const query = debouncedQuery.trim()
    if (!token || !query) {
      setResults({})
      setMessage('')
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setMessage('')

    adminSearch({ q: query, type: filters.type }, token)
      .then((data) => {
        if (active) setResults(data.data || {})
      })
      .catch((error: unknown) => {
        if (!active) return
        setMessage(error instanceof Error ? error.message : 'Error al consultar la búsqueda.')
        setResults({})
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [token, debouncedQuery, filters.type])

  const query = debouncedQuery.trim()
  const visibleGroups = resultGroups.map((group) => ({
    ...group,
    items: Array.isArray(results[group.key]) ? results[group.key] : [],
  }))
  const totalResults = visibleGroups.reduce((total, group) => total + group.items.length, 0)

  const getCountForType = (key: string) => {
    if (key === 'all') return totalResults
    const group = visibleGroups.find((g) => g.key === key)
    return group ? group.items.length : 0
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto flex max-w-7xl flex-col px-6 py-8 lg:px-10 lg:py-10">
        
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-600/15 text-red-500 border border-red-500/25">
                <Search size={13} />
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400">Panel Administrativo</p>
            </div>
            <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight text-white sm:text-4xl">
              Búsqueda Global
            </h1>
            <p className="mt-1 text-xs text-white/50">
              Explora clientes, vehículos, órdenes de trabajo, citas y recibos en un solo lugar.
            </p>
          </div>
          {query && !loading && !message && (
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-950/30 px-3.5 py-1.5 text-xs text-red-300">
              <Sparkles size={13} />
              <span>
                <strong className="text-white font-semibold">{totalResults}</strong> {totalResults === 1 ? 'coincidencia encontrada' : 'coincidencias encontradas'}
              </span>
            </div>
          )}
        </header>

        {/* Search Input Bar */}
        <section aria-label="Filtros de búsqueda" className="space-y-4">
          <div className="relative group">
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40 transition group-focus-within:text-red-500">
              <Search size={20} />
            </div>
            <input
              autoComplete="off"
              aria-label="Buscar registros"
              type="text"
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="Buscar por nombre, documento, correo, placa, orden..."
              className="h-14 w-full rounded-2xl border border-white/15 bg-[#141414] pl-12 pr-28 text-base text-white shadow-lg shadow-black/40 outline-none transition-all placeholder:text-white/35 focus:border-red-500 focus:bg-[#181818] focus:ring-4 focus:ring-red-500/15"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {filters.q ? (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  title="Limpiar búsqueda (Esc)"
                  onClick={() => setFilters((current) => ({ ...current, q: '' }))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 transition hover:bg-red-600 hover:text-white"
                >
                  <X size={15} />
                </button>
              ) : (
                <span className="hidden sm:inline-block rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-white/40">
                  ESC
                </span>
              )}
            </div>
          </div>

          {/* Quick Suggestions */}
          {!query && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-white/40">
              <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-white/30">
                <Filter size={11} /> Sugerencias:
              </span>
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, q: suggestion }))}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/60 transition hover:border-red-500/40 hover:bg-white/[0.08] hover:text-white"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Type Filter Buttons */}
          <div className="flex gap-2 overflow-x-auto pb-1 pt-2 scrollbar-none" role="group" aria-label="Filtrar por tipo">
            {searchTypes.map(({ value, label, icon: Icon, key }) => {
              const selected = filters.type === value
              const count = query && totalResults > 0 ? getCountForType(key) : null
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFilters((current) => ({ ...current, type: value }))}
                  className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-all ${
                    selected
                      ? 'border-red-600 bg-red-600 text-white shadow-md shadow-red-950/60'
                      : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <Icon size={14} className={selected ? 'text-white' : 'text-white/50'} />
                  <span>{label}</span>
                  {count !== null && (
                    <span
                      className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums ${
                        selected ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* Results Area */}
        <div className="mt-8" aria-live="polite" aria-busy={loading}>
          {loading && (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] py-12 text-center text-sm text-white/60">
              <LoaderCircle size={26} className="animate-spin text-red-500" />
              <span>Buscando coincidencias en el sistema...</span>
            </div>
          )}

          {message && (
            <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-300">
              {message}
            </div>
          )}

          {!query && !loading && !message && (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-600/10 text-red-500">
                <Search size={24} />
              </div>
              <h2 className="text-base font-medium text-white/90">Escribe para iniciar la búsqueda</h2>
              <p className="mt-1.5 max-w-md text-xs text-white/45">
                Ingresa una placa (ej. ABC123), nombre de cliente, correo electrónico o número de orden de trabajo.
              </p>
            </div>
          )}

          {query && !loading && !message && totalResults === 0 && (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/40">
                <X size={20} />
              </div>
              <h2 className="text-sm font-semibold text-white/80">Sin coincidencias encontradas</h2>
              <p className="mt-1 text-xs text-white/45">
                No encontramos ningún registro para “<strong className="text-white/70">{query}</strong>”.
              </p>
            </div>
          )}

          {query && totalResults > 0 && (
            <div className="space-y-8">
              {visibleGroups
                .filter((group) => group.items.length > 0)
                .map((group) => {
                  const GroupIcon = group.icon
                  return (
                    <section key={group.key} className="space-y-3">
                      <header className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600/15 text-red-400 border border-red-500/20">
                            <GroupIcon size={15} />
                          </span>
                          <h2 className="text-sm font-semibold text-white tracking-wide">{group.label}</h2>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-white/60">
                            {group.items.length} {group.items.length === 1 ? 'ítem' : 'ítems'}
                          </span>
                          <Link
                            to={group.route}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400 hover:text-red-300 transition"
                          >
                            Ir a módulo <ArrowUpRight size={12} />
                          </Link>
                        </div>
                      </header>

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {group.items.map((item: SearchResult) => {
                          let title = ''
                          let primarySub = ''
                          let secondarySub = ''
                          const state = String(item.estado || '').replaceAll('_', ' ')

                          if (group.key === 'clientes') {
                            title = `${item.nombre || ''} ${item.apellido || ''}`.trim() || 'Cliente'
                            primarySub = item.email || ''
                            secondarySub = [item.documento && `Doc: ${item.documento}`, item.telefono && `Tel: ${item.telefono}`]
                              .filter(Boolean)
                              .join(' · ')
                          } else if (group.key === 'vehiculos') {
                            title = item.placa || 'Vehículo'
                            primarySub = `${item.marca || ''} ${item.modelo || ''}`.trim()
                            secondarySub = item.anio ? `Modelo ${item.anio}` : ''
                          } else if (group.key === 'órdenes') {
                            title = `Orden #${item.id}`
                            primarySub = item.cliente || 'Sin cliente asignado'
                            secondarySub = item.vehiculo_placa ? `Placa: ${item.vehiculo_placa}` : ''
                          } else if (group.key === 'citas') {
                            title = `Cita #${item.id}`
                            primarySub = item.cliente || 'Cliente'
                            secondarySub = [item.vehiculo_placa, item.fecha, item.hora].filter(Boolean).join(' · ')
                          } else {
                            title = `Recibo #${item.id}`
                            primarySub = item.cliente || 'Cliente'
                            secondarySub = [
                              item.orden_id && `Orden #${item.orden_id}`,
                              item.fecha_emision && `Emisión: ${item.fecha_emision.slice(0, 10)}`,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          }

                          return (
                            <Link
                              key={item.id}
                              to={group.route}
                              className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-[#141414] p-4 transition-all hover:border-red-500/40 hover:bg-[#1a1a1a] hover:shadow-lg hover:shadow-black/60"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[11px] font-bold tabular-nums text-white/70">
                                    #{item.id}
                                  </span>
                                  {state && (
                                    <span
                                      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider capitalize ${getStatusStyle(
                                        state
                                      )}`}
                                    >
                                      {state}
                                    </span>
                                  )}
                                </div>
                                <h3 className="mt-3 truncate text-sm font-semibold text-white group-hover:text-red-300 transition-colors">
                                  {title}
                                </h3>
                                {primarySub && (
                                  <p className="mt-1 truncate text-xs text-white/75">{primarySub}</p>
                                )}
                                {secondarySub && (
                                  <p className="mt-0.5 truncate text-[11px] text-white/40">{secondarySub}</p>
                                )}
                              </div>
                              <div className="mt-3 flex items-center justify-end pt-2 border-t border-white/5 text-[11px] text-white/30 group-hover:text-red-400 transition-colors">
                                <span className="inline-flex items-center gap-1 font-medium">
                                  Ver detalle <ArrowUpRight size={12} />
                                </span>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
