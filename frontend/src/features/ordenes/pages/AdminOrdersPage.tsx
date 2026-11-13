/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { getReciboPdfUrl } from '@/features/recibos/services/recibosService'
import { getOrdenes, createOrden, updateOrden, deleteOrden, enviarReciboOrden } from '@/features/recibos/services/pagosService'
import { getAdminServicios } from '@/features/servicios/services/serviciosService'
import { adminSearch } from '@/features/usuarios/services/usuariosService'
import { formatCop } from '@/lib/utils'

type Order = {
  id: number
  cliente: { id: number; nombre: string; apellido: string }
  vehiculo: { id: number; marca: string; modelo: string; placa: string }
  fecha_ingreso: string
  problema_reportado: string
  observaciones: string | null
  estado: string
  subtotal: number
  total: number
  estado_aprobacion: 'pendiente' | 'aprobado' | 'rechazado'
  recibo?: { id: number; estado: string; enviado_cliente: boolean } | null
  servicios: Array<{ servicio_id: number | null; nombre: string; cantidad: number; precio: number; subtotal: number }>
}

type Option = { id: number; label: string }
type CatalogService = { id: number; nombre: string; precio: number; estado: string }

const statuses = ['pendiente', 'en_diagnostico', 'en_reparacion', 'terminada', 'entregada', 'cancelada']
const emptyForm = { cliente_id: '', vehiculo_id: '', problema_reportado: '', estado: 'pendiente', observaciones: '', servicios: [{ servicio_id: '', cantidad: '1' }] }

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Option[]>([])
  const [vehicles, setVehicles] = useState<Option[]>([])
  const [catalogServices, setCatalogServices] = useState<CatalogService[]>([])
  const [token] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)

  async function loadData(authToken: string) {
    const [orderData, clientData, vehicleData, serviceData] = await Promise.all([
      getOrdenes(authToken),
      adminSearch({ q: '', type: 'cliente' }, authToken),
      adminSearch({ q: '', type: 'vehiculo' }, authToken),
      getAdminServicios({ estado: 'activo' }, authToken),
    ])
    setOrders(orderData.data || [])
    setClients((clientData.data?.clientes || []).map((item: { id: number; nombre: string; apellido: string }) => ({
      id: item.id,
      label: `${item.nombre} ${item.apellido}`,
    })))
    setVehicles((vehicleData.data?.vehiculos || []).map((item: { id: number; marca: string; modelo: string; placa: string }) => ({
      id: item.id,
      label: `${item.marca} ${item.modelo} (${item.placa})`,
    })))
    setCatalogServices(serviceData.data || [])
  }

  useEffect(() => {
    if (!token) {
      window.location.href = '/sign-in'
      return
    }
    loadData(token)
      .catch((error) => setMessage(error instanceof Error ? error.message : 'No fue posible cargar los datos.'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function selectOrder(order: Order) {
    setSelectedId(order.id)
    const serviceLines = order.servicios.map((line) => {
      const service = catalogServices.find((item) => item.id === line.servicio_id)
        || catalogServices.find((item) => item.nombre === line.nombre)
      return { servicio_id: service ? String(service.id) : '', cantidad: String(line.cantidad || 1) }
    })
    setForm({
      cliente_id: String(order.cliente.id),
      vehiculo_id: String(order.vehiculo.id),
      problema_reportado: order.problema_reportado,
      estado: order.estado,
      observaciones: order.observaciones || '',
      servicios: serviceLines.length ? serviceLines : [{ servicio_id: '', cantidad: '1' }],
    })
  }

  function resetForm() {
    setSelectedId(null)
    setForm({ ...emptyForm, servicios: [{ servicio_id: '', cantidad: '1' }] })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    if (form.servicios.length === 0 || form.servicios.some((line) => !line.servicio_id || !Number.isInteger(Number(line.cantidad)) || Number(line.cantidad) < 1)) {
      setMessage('Agrega al menos un servicio y una cantidad válida para generar el cobro.')
      return
    }
    const payload = {
      cliente_id: Number(form.cliente_id),
      vehiculo_id: Number(form.vehiculo_id),
      problema_reportado: form.problema_reportado,
      estado: form.estado,
      observaciones: form.observaciones || null,
      servicios: form.servicios.map((line) => ({
        servicio_id: Number(line.servicio_id),
        cantidad: Number(line.cantidad),
      })),
    }
    try {
      if (selectedId) await updateOrden(selectedId, payload, token)
      else await createOrden(payload, token)
    } catch (error: any) {
      setMessage(error.message || 'No fue posible guardar la orden.')
      return
    }
    setMessage(selectedId ? 'Orden actualizada.' : 'Orden creada.')
    resetForm()
    await loadData(token)
  }

  async function remove(orderId: number) {
    try {
      await deleteOrden(orderId, token)
    } catch (error: any) {
      setMessage(error.message || 'No fue posible eliminar la orden.')
      return
    }
    setMessage('Orden eliminada.')
    await loadData(token)
  }

  async function sendReceipt(orderId: number) {
    try {
      await enviarReciboOrden(orderId, token)
      setMessage(`Recibo de la orden #${orderId} enviado al cliente.`)
      await loadData(token)
    } catch (error: any) {
      setMessage(error.message || 'No fue posible enviar el recibo.')
    }
  }

  const estimatedTotal = form.servicios.reduce((total, line) => {
    const service = catalogServices.find((item) => item.id === Number(line.servicio_id))
    return total + Number(service?.precio || 0) * Number(line.cantidad || 0)
  }, 0)

  return (
    <main className="min-h-screen bg-[#090909] px-6 py-10 text-white lg:px-10 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-red-900/50 pb-8">
          <div>
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400">Operacion / Taller</p>
            <h1 className="mt-3 font-serif text-5xl text-white">Ordenes de trabajo.</h1>
          </div>
        </div>

        {message && <p className="mt-6 border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">{message}</p>}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
          <section className="overflow-hidden border border-red-900/40 bg-[#121212] shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
            <div className="border-b border-red-900/40 bg-black/30 p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-400">Seguimiento</p>
              <h2 className="mt-2 font-serif text-2xl text-white">Ordenes registradas</h2>
            </div>
            {loading ? <p className="p-6 text-sm text-white/50">Cargando ordenes...</p> : orders.length === 0 ? <p className="p-6 text-sm text-white/50">No hay ordenes registradas.</p> : (
              <div className="divide-y divide-white/10">
                {orders.map((order) => (
                  <article key={order.id} className="flex flex-wrap items-center justify-between gap-4 p-6 transition hover:bg-white/[0.03]">
                    <div>
                      <p className="font-medium text-white">Orden #{order.id} · {order.cliente.nombre} {order.cliente.apellido}</p>
                      <p className="mt-1 text-sm text-white/55">{order.vehiculo.marca} {order.vehiculo.modelo} · {order.vehiculo.placa}</p>
                      <p className="mt-1 max-w-2xl truncate text-xs text-white/45">{order.servicios.map((service) => `${service.nombre} × ${service.cantidad}`).join(' · ') || 'Sin servicios registrados'}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.12em] text-red-300">{order.estado} <span className="text-white/35">· {formatCop(order.total)}</span></p>
                      <p className="mt-1 text-xs text-white/50">Aprobación del cliente: {order.estado_aprobacion} · Recibo: {order.recibo?.enviado_cliente ? 'enviado' : 'pendiente de envío'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => selectOrder(order)} className="border border-red-500/50 bg-red-950/20 px-3 py-2 text-xs text-red-300 transition hover:bg-red-600 hover:text-white">Editar</button>
                      {order.recibo?.id && <a href={getReciboPdfUrl(order.recibo.id, token)} target="_blank" rel="noopener noreferrer" className="border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10">PDF</a>}
                      {order.estado_aprobacion === 'aprobado' && !order.recibo?.enviado_cliente && <button type="button" onClick={() => void sendReceipt(order.id)} className="border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200 transition hover:bg-emerald-800/50">Enviar recibo</button>}
                      <button type="button" onClick={() => remove(order.id)} className="border border-red-500/40 px-3 py-2 text-xs text-red-300 transition hover:bg-red-950/50">Eliminar</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="border border-red-900/40 bg-[#151515] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-400">Editor</p>
                <h2 className="mt-2 font-serif text-2xl">{selectedId ? `Editar #${selectedId}` : 'Nueva orden'}</h2>
              </div>
              {selectedId && <button type="button" onClick={resetForm} className="text-xs text-red-300 hover:text-white">Cancelar edición</button>}
            </div>
            <form onSubmit={submit} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-xs text-white/70">Cliente
                <select required value={form.cliente_id} onChange={(event) => setForm({ ...form, cliente_id: event.target.value })} className="border border-white/10 bg-[#0d0d0d] p-3 text-white">
                  <option value="">Selecciona un cliente</option>
                  {clients.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-xs text-white/70">Vehiculo
                <select required value={form.vehiculo_id} onChange={(event) => setForm({ ...form, vehiculo_id: event.target.value })} className="border border-white/10 bg-[#0d0d0d] p-3 text-white">
                  <option value="">Selecciona un vehiculo</option>
                  {vehicles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <section className="grid gap-3 border border-white/10 bg-black/20 p-3" aria-label="Servicios para facturar">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-white">Servicios para facturar</p>
                    <p className="mt-1 text-[10px] text-white/45">El cobro usa el precio del catálogo.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, servicios: [...current.servicios, { servicio_id: '', cantidad: '1' }] }))}
                    aria-label="Agregar servicio"
                    title="Agregar servicio"
                    className="flex h-9 w-9 shrink-0 items-center justify-center border border-red-500/40 text-red-300 transition hover:bg-red-600 hover:text-white"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {form.servicios.map((line, index) => {
                  const selectedService = catalogServices.find((service) => service.id === Number(line.servicio_id))
                  const quantity = Number(line.cantidad || 0)
                  return (
                    <div key={index} className="grid grid-cols-[minmax(0,1fr)_5rem_2.25rem] items-end gap-2">
                      <label className="grid min-w-0 gap-2 text-[10px] text-white/55">Servicio
                        <select
                          required
                          value={line.servicio_id}
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            servicios: current.servicios.map((item, itemIndex) => itemIndex === index ? { ...item, servicio_id: event.target.value } : item),
                          }))}
                          className="w-full min-w-0 border border-white/10 bg-[#0d0d0d] p-3 text-xs text-white"
                        >
                          <option value="">Selecciona servicio</option>
                          {catalogServices.map((service) => (
                            <option key={service.id} value={service.id}>{service.nombre} · {formatCop(Number(service.precio))}</option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-[10px] text-white/55">Cantidad
                        <input
                          required
                          type="number"
                          min="1"
                          step="1"
                          value={line.cantidad}
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            servicios: current.servicios.map((item, itemIndex) => itemIndex === index ? { ...item, cantidad: event.target.value } : item),
                          }))}
                          className="w-full border border-white/10 bg-[#0d0d0d] p-3 text-xs text-white"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, servicios: current.servicios.filter((_, itemIndex) => itemIndex !== index) }))}
                        disabled={form.servicios.length === 1}
                        aria-label="Quitar servicio"
                        title="Quitar servicio"
                        className="mb-px flex h-10 w-9 items-center justify-center text-white/45 transition hover:bg-red-950/50 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-25"
                      >
                        <Trash2 size={15} />
                      </button>
                      {selectedService && (
                        <p className="col-span-3 -mt-1 text-right text-[10px] text-white/45">Subtotal: {formatCop(Number(selectedService.precio) * quantity)}</p>
                      )}
                    </div>
                  )
                })}
                <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                  <span className="text-white/55">Total estimado</span>
                  <strong className="text-white">{formatCop(estimatedTotal)}</strong>
                </div>
              </section>
              <label className="grid gap-2 text-xs text-white/70">Estado
                <select value={form.estado} onChange={(event) => setForm({ ...form, estado: event.target.value })} className="border border-white/10 bg-[#0d0d0d] p-3 text-white">
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-xs text-white/70">Problema reportado
                <textarea required value={form.problema_reportado} onChange={(event) => setForm({ ...form, problema_reportado: event.target.value })} className="border border-white/10 bg-[#0d0d0d] p-3 text-white" rows={3} />
              </label>
              <label className="grid gap-2 text-xs text-white/70">Observaciones
                <textarea value={form.observaciones} onChange={(event) => setForm({ ...form, observaciones: event.target.value })} className="border border-white/10 bg-[#0d0d0d] p-3 text-white" rows={2} />
              </label>
              <button type="submit" className="bg-red-600 p-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-red-500">{selectedId ? 'Guardar cambios' : 'Crear orden'}</button>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}