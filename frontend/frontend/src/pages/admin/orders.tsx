
import { FormEvent, useEffect, useState } from 'react'
import { getApiUrl } from '@/lib/config'
import AdminBackLink from '@/components/admin-back-link'

const apiUrl = getApiUrl('')

type Order = {
  id: number
  cliente: { id: number; nombre: string; apellido: string }
  vehiculo: { id: number; marca: string; modelo: string; placa: string }
  fecha_ingreso: string
  kilometraje: number
  problema_reportado: string
  diagnostico: string | null
  trabajo_realizado: string | null
  observaciones: string | null
  estado: string
  subtotal: number
  total: number
  recibo?: { id: number; estado: string } | null
  servicios: Array<{ servicio_id: number; nombre: string; cantidad: number; precio: number; subtotal: number }>
}

type Option = { id: number; label: string }

const statuses = ['pendiente', 'en_diagnostico', 'en_reparacion', 'terminada', 'entregada', 'cancelada']

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Option[]>([])
  const [vehicles, setVehicles] = useState<Option[]>([])
  const [services, setServices] = useState<Option[]>([])
  const [token, setToken] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ cliente_id: '', vehiculo_id: '', servicio_id: '', cantidad: '1', kilometraje: '0', problema_reportado: '', estado: 'pendiente', diagnostico: '', trabajo_realizado: '', observaciones: '' })

  async function loadData(authToken: string) {
    const headers = { Authorization: `Bearer ${authToken}` }
    const [ordersResponse, clientsResponse, vehiclesResponse, servicesResponse] = await Promise.all([
      fetch(`${apiUrl}/api/admin/ordenes`, { headers }),
      fetch(`${apiUrl}/api/admin/search?type=cliente&q=`, { headers }),
      fetch(`${apiUrl}/api/admin/search?type=vehiculo&q=`, { headers }),
      fetch(`${apiUrl}/api/services`),
    ])
    if (!ordersResponse.ok || !clientsResponse.ok || !vehiclesResponse.ok || !servicesResponse.ok) throw new Error('No fue posible cargar los datos de órdenes.')
    const orderData = await ordersResponse.json()
    const clientData = await clientsResponse.json()
    const vehicleData = await vehiclesResponse.json()
    const serviceData = await servicesResponse.json()
    setOrders(orderData.data || [])
    setClients((clientData.data?.clientes || []).map((item: { id: number; nombre: string; apellido: string }) => ({ id: item.id, label: `${item.nombre} ${item.apellido}` })))
    setVehicles((vehicleData.data?.vehiculos || []).map((item: { id: number; marca: string; modelo: string; placa: string }) => ({ id: item.id, label: `${item.marca} ${item.modelo} (${item.placa})` })))
    setServices((serviceData.data || []).map((item: { id: number; name: string }) => ({ id: item.id, label: item.name })))
  }

  useEffect(() => {
    const storedToken = localStorage.getItem('jenna_car_token') || ''
    setToken(storedToken)
    if (!storedToken) {
      window.location.href = '/sign-in'
      return
    }
    loadData(storedToken).catch((error) => setMessage(error instanceof Error ? error.message : 'No fue posible cargar los datos.')).finally(() => setLoading(false))
  }, [])

  function selectOrder(order: Order) {
    setSelectedId(order.id)
    setForm({ cliente_id: String(order.cliente.id), vehiculo_id: String(order.vehiculo.id), servicio_id: String(order.servicios[0]?.servicio_id || ''), cantidad: String(order.servicios[0]?.cantidad || 1), kilometraje: String(order.kilometraje), problema_reportado: order.problema_reportado, estado: order.estado, diagnostico: order.diagnostico || '', trabajo_realizado: order.trabajo_realizado || '', observaciones: order.observaciones || '' })
  }

  function resetForm() {
    setSelectedId(null)
    setForm({ cliente_id: '', vehiculo_id: '', servicio_id: '', cantidad: '1', kilometraje: '0', problema_reportado: '', estado: 'pendiente', diagnostico: '', trabajo_realizado: '', observaciones: '' })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    const payload = { cliente_id: Number(form.cliente_id), vehiculo_id: Number(form.vehiculo_id), kilometraje: Number(form.kilometraje), problema_reportado: form.problema_reportado, estado: form.estado, diagnostico: form.diagnostico || null, trabajo_realizado: form.trabajo_realizado || null, observaciones: form.observaciones || null, servicios: form.servicio_id ? [{ servicio_id: Number(form.servicio_id), cantidad: Number(form.cantidad) }] : [] }
    const response = await fetch(`${apiUrl}/api/admin/ordenes${selectedId ? `/${selectedId}` : ''}`, { method: selectedId ? 'PUT' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await response.json()
    if (!response.ok) { setMessage(data.error || 'No fue posible guardar la orden.'); return }
    setMessage(selectedId ? 'Orden actualizada.' : 'Orden creada.')
    resetForm()
    await loadData(token)
  }

  async function remove(orderId: number) {
    const response = await fetch(`${apiUrl}/api/admin/ordenes/${orderId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    const data = await response.json()
    if (!response.ok) { setMessage(data.error || 'No fue posible eliminar la orden.'); return }
    setMessage('Orden eliminada.')
    await loadData(token)
  }

  return (
    <main className="min-h-screen bg-[#090909] px-6 py-10 text-white lg:px-10 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-red-900/50 pb-8"><div><AdminBackLink /><p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400">Operación / Taller</p><h1 className="mt-3 font-serif text-5xl text-white">Órdenes de trabajo.</h1></div><a href="/admin/search" className="border border-red-900/50 px-4 py-2 text-xs text-red-300 transition hover:border-red-500 hover:text-white">Búsqueda avanzada</a></div>
        {message && <p className="mt-6 border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">{message}</p>}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
          <section className="overflow-hidden border border-red-900/40 bg-[#121212] shadow-[0_24px_80px_rgba(0,0,0,0.25)]"><div className="border-b border-red-900/40 bg-black/30 p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-400">Seguimiento</p><h2 className="mt-2 font-serif text-2xl text-white">Órdenes registradas</h2></div>{loading ? <p className="p-6 text-sm text-white/50">Cargando órdenes...</p> : orders.length === 0 ? <p className="p-6 text-sm text-white/50">No hay órdenes registradas.</p> : <div className="divide-y divide-white/10">{orders.map((order) => <article key={order.id} className="flex flex-wrap items-center justify-between gap-4 p-6 transition hover:bg-white/[0.03]"><div><p className="font-medium text-white">Orden #{order.id} · {order.cliente.nombre} {order.cliente.apellido}</p><p className="mt-1 text-sm text-white/55">{order.vehiculo.marca} {order.vehiculo.modelo} · {order.vehiculo.placa}</p><p className="mt-2 text-xs uppercase tracking-[0.12em] text-red-300">{order.estado} <span className="text-white/35">· {order.kilometraje} km · ${order.total.toFixed(2)}</span></p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => selectOrder(order)} className="border border-red-500/50 bg-red-950/20 px-3 py-2 text-xs text-red-300 transition hover:bg-red-600 hover:text-white">Editar</button>{order.recibo?.id && (<a href={`${apiUrl}/api/recibos/${order.recibo.id}/pdf?token=${token}`} target="_blank" rel="noopener noreferrer" className="border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10">PDF</a>)}<button type="button" onClick={() => remove(order.id)} className="border border-red-500/40 px-3 py-2 text-xs text-red-300 transition hover:bg-red-950/50">Eliminar</button></div></article>)}</div>}</section>
          <section className="border border-red-900/40 bg-[#151515] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.25)]"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-400">Editor</p><h2 className="mt-2 font-serif text-2xl">{selectedId ? `Editar #${selectedId}` : 'Nueva orden'}</h2></div>{selectedId && <button type="button" onClick={resetForm} className="text-xs text-red-300 hover:text-white">Nueva</button>}</div><form onSubmit={submit} className="mt-6 grid gap-4"><label className="grid gap-2 text-xs text-white/70">Cliente<select required value={form.cliente_id} onChange={(event) => setForm({ ...form, cliente_id: event.target.value })} className="border border-white/10 bg-[#0d0d0d] p-3 text-white"><option value="">Selecciona un cliente</option>{clients.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="grid gap-2 text-xs text-white/70">Vehículo<select required value={form.vehiculo_id} onChange={(event) => setForm({ ...form, vehiculo_id: event.target.value })} className="border border-white/10 bg-[#0d0d0d] p-3 text-white"><option value="">Selecciona un vehículo</option>{vehicles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="grid gap-2 text-xs text-white/70">Servicio<select value={form.servicio_id} onChange={(event) => setForm({ ...form, servicio_id: event.target.value })} className="border border-white/10 bg-[#0d0d0d] p-3 text-white"><option value="">Sin servicio</option>{services.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="grid gap-2 text-xs text-white/70">Cantidad<input type="number" min="1" value={form.cantidad} onChange={(event) => setForm({ ...form, cantidad: event.target.value })} className="border border-white/10 bg-[#0d0d0d] p-3 text-white" /></label><label className="grid gap-2 text-xs text-white/70">Kilometraje<input required type="number" min="0" value={form.kilometraje} onChange={(event) => setForm({ ...form, kilometraje: event.target.value })} className="border border-white/10 bg-[#0d0d0d] p-3 text-white" /></label><label className="grid gap-2 text-xs text-white/70">Estado<select value={form.estado} onChange={(event) => setForm({ ...form, estado: event.target.value })} className="border border-white/10 bg-[#0d0d0d] p-3 text-white">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label className="grid gap-2 text-xs text-white/70">Problema reportado<textarea required value={form.problema_reportado} onChange={(event) => setForm({ ...form, problema_reportado: event.target.value })} className="border border-white/10 bg-[#0d0d0d] p-3 text-white" rows={3} /></label><label className="grid gap-2 text-xs text-white/70">Diagnóstico<textarea value={form.diagnostico} onChange={(event) => setForm({ ...form, diagnostico: event.target.value })} className="border border-white/10 bg-[#0d0d0d] p-3 text-white" rows={2} /></label><button type="submit" className="bg-red-600 p-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-red-500">{selectedId ? 'Guardar cambios' : 'Crear orden'}</button></form></section>
        </div>
      </div>
    </main>
  )
}
