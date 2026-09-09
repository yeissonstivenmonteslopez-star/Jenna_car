/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import { adminSearch } from '@/features/usuarios/services/usuariosService'

interface SearchFilters {
  q: string
  type: 'all' | 'cliente' | 'vehiculo' | 'orden' | 'cita' | 'recibo'
}

export default function AdminSearch() {
  const [filters, setFilters] = useState<SearchFilters>({ q: '', type: 'all' })
  const [token] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''))
  const [results, setResults] = useState<{ [key: string]: any }>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(filters.q), 300)
    return () => window.clearTimeout(timeout)
  }, [filters.q])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''
    if (!token) { window.location.href = '/sign-in'; return }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return
    const fetchResults = async () => {
      setLoading(true)
      try {
        try {
          const data = await adminSearch({ q: debouncedQuery, type: filters.type }, token)
          setResults(data.data)
          setMessage('')
        } catch (err: any) {
          setMessage(err.message || 'Error en la búsqueda')
          setResults({})
        }
      } catch {
        setMessage('Error al conectar con el servidor')
        setResults({})
      } finally {
        setLoading(false)
      }
    }
    fetchResults()
  }, [token, debouncedQuery, filters.type])

  const hasResults = Object.values(results).some((value) => Array.isArray(value) && value.length > 0)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-serif mb-6">Búsqueda Avanzada</h1>

      {message && <p className="mb-4 text-accent">{message}</p>}

      <div className="bg-secondary rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-foreground/60 block mb-1">Buscar</label>
            <input
              type="text"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="Nombre, documento, correo, placa, marca, modelo..."
              className="w-full border border-border bg-field px-4 py-3 text-sm outline-none focus:border-accent rounded"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-foreground/60 block mb-1">Tipo</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
              className="border border-border bg-field px-4 py-3 text-sm outline-none focus:border-accent rounded w-full"
            >
              <option value="all">Todos los tipos</option>
              <option value="cliente">Clientes</option>
              <option value="vehiculo">Vehículos</option>
              <option value="orden">Órdenes de trabajo</option>
              <option value="cita">Citas</option>
              <option value="recibo">Recibos</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <p className="text-primary-foreground/50">Cargando resultados...</p>}

      {Object.keys(results).length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {results.clientes && results.clientes.length > 0 && (
            <div className="border border-border bg-secondary rounded-lg p-6">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-foreground/60 mb-4">Clientes</h2>
              <ul className="space-y-3">
                {results.clientes.map((c: any) => (
                  <li key={c.id} className="flex items-center gap-3 border-b border-border pb-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-medium">{c.nombre.charAt(0)}</span>
                    <div>
                      <p className="text-sm font-medium">{c.nombre} {c.apellido}</p>
                      <p className="text-[10px] text-primary-foreground/60">{c.documento} · {c.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.vehiculos && results.vehiculos.length > 0 && (
            <div className="border border-border bg-secondary rounded-lg p-6">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-foreground/60 mb-4">Vehículos</h2>
              <ul className="space-y-3">
                {results.vehiculos.map((v: any) => (
                  <li key={v.id} className="flex items-center gap-3 border-b border-border pb-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded bg-primary-foreground/15 flex items-center justify-center text-xs text-primary-foreground font-medium">{v.marca.charAt(0)}{v.modelo.charAt(0)}</span>
                    <div>
                      <p className="text-sm font-medium">{v.marca} {v.modelo}</p>
                      <p className="text-[10px] text-primary-foreground/60">{v.placa} · Año: {v.anio || 'N/A'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results['órdenes'] && results['órdenes'].length > 0 && (
            <div className="border border-border bg-secondary rounded-lg p-6">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-foreground/60 mb-4">Órdenes</h2>
              <ul className="space-y-3">
                {results['órdenes'].map((o: any) => (
                  <li key={o.id} className="flex items-center gap-3 border-b border-border pb-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded bg-primary-foreground/15 flex items-center justify-center text-xs text-primary-foreground font-medium">{o.id}</span>
                    <div>
                      <p className="text-sm font-medium">Orden #{o.id}</p>
                      <p className="text-[10px] text-primary-foreground/60">Placa: {o.vehiculo_placa} · {o.estado}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.citas && results.citas.length > 0 && (
            <div className="border border-border bg-secondary rounded-lg p-6">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-foreground/60 mb-4">Citas</h2>
              <ul className="space-y-3">
                {results.citas.map((c: any) => (
                  <li key={c.id} className="flex items-center gap-3 border-b border-border pb-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded bg-primary-foreground/15 flex items-center justify-center text-xs text-primary-foreground font-medium">{c.id}</span>
                    <div>
                      <p className="text-sm font-medium">Cita #{c.id}</p>
                      <p className="text-[10px] text-primary-foreground/60">{c.fecha} · {c.hora} · {c.estado}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.recibos && results.recibos.length > 0 && (
            <div className="border border-border bg-secondary rounded-lg p-6">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-foreground/60 mb-4">Recibos</h2>
              <ul className="space-y-3">
                {results.recibos.map((r: any) => (
                  <li key={r.id} className="flex items-center gap-3 border-b border-border pb-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded bg-primary-foreground/15 flex items-center justify-center text-xs text-primary-foreground font-medium">{r.id}</span>
                    <div>
                      <p className="text-sm font-medium">Recibo #{r.id}</p>
                      <p className="text-[10px] text-primary-foreground/60">{r.cliente} · {r.estado}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!hasResults && debouncedQuery && !loading && !message && (
        <p className="mt-6 text-sm text-primary-foreground/50 text-center">Sin resultados para: "{debouncedQuery}"</p>
      )}
    </div>
  )
}