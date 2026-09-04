'use client'

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
    <main className="min-h-screen bg-secondary px-6 py-10 text-secondary-foreground lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6"><div><AdminBackLink /><h1 className="mt-3 font-serif text-5xl">Órdenes de trabajo.</h1></div><a href="/admin/search" className="text-xs text-accent">Búsqueda avanzada</a></div>
        {message && <p className="mt-6 border border-accent/30 p-4 text-sm text-accent">{message}</p>}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
          <section className="border border-border bg-secondary"><div className="border-b border-border p-6"><h2 className="font-serif text-2xl">Órdenes registradas</h2></div>{loading ? <p className="p-6 text-sm text-muted-foreground">Cargando órdenes...</p> : orders.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No hay órdenes registradas.</p> : <div className="divide-y divide-border">{orders.map((order) => <article key={order.id} className="flex flex-wrap items-center justify-between gap-4 p-6"><div><p className="font-medium">Orden #{order.id} · {order.cliente.nombre} {order.cliente.apellido}</p><p className="mt-1 text-sm text-muted-foreground">{order.vehiculo.marca} {order.vehiculo.modelo} · {order.vehiculo.placa}</p><p className="mt-1 text-xs text-muted-foreground">{order.estado} · {order.kilometraje} km · €{order.total.toFixed(2)}</p></div><div className="flex gap-3"><button type="button" onClick={() => selectOrder(order)} className="border border-accent px-3 py-2 text-xs text-accent">Editar</button>{order.recibo?.id && (<a href={`${apiUrl}/api/recibos/${order.recibo.id}/pdf?token=${token}`} target="_blank" rel="noopener noreferrer" className="border border-accent/50 bg-accent/10 px-3 py-2 text-xs text-accent">PDF</a>)}<button type="button" onClick={() => remove(order.id)} className="border border-red-300 px-3 py-2 text-xs text-red-700">Eliminar</button></div></article>)}</div>}</section>
          <section className="bg-primary p-6 text-primary-foreground"><div className="flex items-center justify-between"><h2 className="font-serif text-2xl">{selectedId ? `Editar #${selectedId}` : 'Nueva orden'}</h2>{selectedId && <button type="button" onClick={resetForm} className="text-xs text-accent">Nueva</button>}</div><form onSubmit={submit} className="mt-6 grid gap-4"><label className="grid gap-2 text-xs">Cliente<select required value={form.cliente_id} onChange={(event) => setForm({ ...form, cliente_id: event.target.value })} className="bg-field p-3 text-primary"><option value="">Selecciona un cliente</option>{clients.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="grid gap-2 text-xs">Vehículo<select required value={form.vehiculo_id} onChange={(event) => setForm({ ...form, vehiculo_id: event.target.value })} className="bg-field p-3 text-primary"><option value="">Selecciona un vehículo</option>{vehicles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="grid gap-2 text-xs">Servicio<select value={form.servicio_id} onChange={(event) => setForm({ ...form, servicio_id: event.target.value })} className="bg-field p-3 text-primary"><option value="">Sin servicio</option>{services.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="grid gap-2 text-xs">Cantidad<input type="number" min="1" value={form.cantidad} onChange={(event) => setForm({ ...form, cantidad: event.target.value })} className="bg-field p-3 text-primary" /></label><label className="grid gap-2 text-xs">Kilometraje<input required type="number" min="0" value={form.kilometraje} onChange={(event) => setForm({ ...form, kilometraje: event.target.value })} className="bg-field p-3 text-primary" /></label><label className="grid gap-2 text-xs">Estado<select value={form.estado} onChange={(event) => setForm({ ...form, estado: event.target.value })} className="bg-field p-3 text-primary">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label className="grid gap-2 text-xs">Problema reportado<textarea required value={form.problema_reportado} onChange={(event) => setForm({ ...form, problema_reportado: event.target.value })} className="bg-field p-3 text-primary" rows={3} /></label><label className="grid gap-2 text-xs">Diagnóstico<textarea value={form.diagnostico} onChange={(event) => setForm({ ...form, diagnostico: event.target.value })} className="bg-field p-3 text-primary" rows={2} /></label><button type="submit" className="bg-accent p-3 text-xs font-semibold text-accent-foreground">{selectedId ? 'Guardar cambios' : 'Crear orden'}</button></form></section>
        </div>
      </div>
    </main>
  )
}
