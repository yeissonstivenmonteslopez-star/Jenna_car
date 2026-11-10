import { useEffect, useState } from 'react'
import { CalendarDays, Car, ClipboardList, LoaderCircle, Receipt, Search, Users, X } from 'lucide-react'
import { adminSearch } from '@/features/usuarios/services/usuariosService'

type SearchType = 'all' | 'cliente' | 'vehiculo' | 'orden' | 'cita' | 'recibo'

interface SearchFilters {
  q: string
  type: SearchType
}

const searchTypes = [
  { value: 'all', label: 'Todo', icon: Search },
  { value: 'cliente', label: 'Clientes', icon: Users },
  { value: 'vehiculo', label: 'Vehículos', icon: Car },
  { value: 'orden', label: 'Órdenes', icon: ClipboardList },
  { value: 'cita', label: 'Citas', icon: CalendarDays },
  { value: 'recibo', label: 'Recibos', icon: Receipt },
] satisfies Array<{ value: SearchType; label: string; icon: typeof Search }>

const resultGroups = [
  { key: 'clientes', label: 'Clientes', icon: Users },
  { key: 'vehiculos', label: 'Vehículos', icon: Car },
  { key: 'órdenes', label: 'Órdenes de trabajo', icon: ClipboardList },
  { key: 'citas', label: 'Citas', icon: CalendarDays },
  { key: 'recibos', label: 'Recibos', icon: Receipt },
] satisfies Array<{ key: string; label: string; icon: typeof Search }>

export default function AdminSearch() {
  const [filters, setFilters] = useState<SearchFilters>({ q: '', type: 'all' })
  const [token] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''))
  const [results, setResults] = useState<{ [key: string]: any }>({})
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
        setMessage(error instanceof Error ? error.message : 'Error en la búsqueda')
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

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <div className="mx-auto flex max-w-7xl flex-col px-6 py-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400">Operación</p>
            <h1 className="mt-2 font-serif text-3xl text-white sm:text-4xl">Búsqueda global</h1>
          </div>
          {query && !loading && !message && (
            <p className="text-sm text-white/55" aria-live="polite">
              <span className="font-semibold text-white">{totalResults}</span> {totalResults === 1 ? 'resultado' : 'resultados'}
            </p>
          )}
        </header>

        <section aria-label="Filtros de búsqueda">
          <div className="relative">
            <Search size={19} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-red-400" />
            <input
              autoComplete="off"
              aria-label="Buscar en clientes, vehículos, órdenes, citas y recibos"
              type="text"
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="Nombre, correo, placa, número de orden..."
              className="h-14 w-full rounded-lg border border-white/15 bg-[#111] pl-12 pr-12 text-base text-white outline-none transition placeholder:text-white/35 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20"
            />
            {filters.q && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                title="Limpiar búsqueda"
                onClick={() => setFilters((current) => ({ ...current, q: '' }))}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-white/50 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-red-400"
              >
                <X size={17} />
              </button>
            )}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filtrar por tipo">
            {searchTypes.map(({ value, label, icon: Icon }) => {
              const selected = filters.type === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFilters((current) => ({ ...current, type: value }))}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 ${selected ? 'border-red-500/60 bg-red-950/35 text-red-300' : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:bg-white/[0.07] hover:text-white'}`}
                >
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </button>
              )
            })}
          </div>
        </section>

        <div className="mt-8" aria-live="polite" aria-busy={loading}>
          {loading && (
            <div className="flex items-center gap-3 border-t border-white/10 py-6 text-sm text-white/55">
              <LoaderCircle size={17} className="animate-spin text-red-400" />
              Buscando registros...
            </div>
          )}

          {message && <p role="alert" className="border-t border-red-500/30 py-5 text-sm text-red-300">{message}</p>}

          {!query && !loading && !message && (
            <div className="flex min-h-52 flex-col items-center justify-center border-t border-white/10 py-12 text-center">
              <Search size={25} aria-hidden="true" className="mb-4 text-red-400/80" />
              <p className="text-sm font-medium text-white/80">Sin búsqueda activa</p>
              <p className="mt-1 text-xs text-white/40">Los resultados aparecerán aquí</p>
            </div>
          )}

          {query && !loading && !message && totalResults === 0 && (
            <div className="border-t border-white/10 py-8">
              <p className="text-sm font-medium text-white/80">Sin coincidencias</p>
              <p className="mt-1 text-xs text-white/45">No encontramos resultados para “{query}”.</p>
            </div>
          )}

          {query && totalResults > 0 && (
            <div className="space-y-8">
              {visibleGroups.filter((group) => group.items.length > 0).map((group) => {
                const Icon = group.icon
                return (
                  <section key={group.key}>
                    <header className="flex items-center gap-2 border-b border-white/10 pb-3">
                      <Icon size={16} aria-hidden="true" className="text-red-400" />
                      <h2 className="text-sm font-semibold text-white">{group.label}</h2>
                      <span className="ml-auto text-xs tabular-nums text-white/40">{group.items.length}</span>
                    </header>
                    <ul>
                      {group.items.map((item: any) => {
                        let title = ''
                        let detail = ''
                        const state = String(item.estado || '').replaceAll('_', ' ')

                        if (group.key === 'clientes') {
                          title = `${item.nombre || ''} ${item.apellido || ''}`.trim()
                          detail = [item.documento, item.email, item.telefono].filter(Boolean).join(' · ')
                        } else if (group.key === 'vehiculos') {
                          title = `${item.marca || ''} ${item.modelo || ''}`.trim()
                          detail = [item.placa, item.anio ? `Año ${item.anio}` : ''].filter(Boolean).join(' · ')
                        } else if (group.key === 'órdenes') {
                          title = `Orden #${item.id}`
                          detail = [item.cliente, item.vehiculo_placa && `Placa ${item.vehiculo_placa}`].filter(Boolean).join(' · ')
                        } else if (group.key === 'citas') {
                          title = `Cita #${item.id}`
                          detail = [item.cliente, item.vehiculo_placa, item.fecha, item.hora].filter(Boolean).join(' · ')
                        } else {
                          title = `Recibo #${item.id}`
                          detail = [item.cliente, item.orden_id && `Orden #${item.orden_id}`, item.fecha_emision?.slice(0, 10)].filter(Boolean).join(' · ')
                        }

                        return (
                          <li key={item.id} className="flex min-w-0 items-center gap-3 border-b border-white/[0.07] py-3.5 transition hover:bg-white/[0.025]">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.035] text-xs font-semibold tabular-nums text-white/65">
                              {String(item.id).slice(-2).padStart(2, '0')}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">{title}</p>
                              {detail && <p className="mt-1 truncate text-xs text-white/45">{detail}</p>}
                            </div>
                            {state && <span className="shrink-0 rounded border border-white/10 px-2 py-1 text-[10px] capitalize text-white/55">{state}</span>}
                          </li>
                        )
                      })}
                    </ul>
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