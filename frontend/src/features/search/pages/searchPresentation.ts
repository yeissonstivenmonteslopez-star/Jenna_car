export interface SearchResult {
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

export function presentSearchResult(group: string, item: SearchResult) {
  let title: string
  let primarySub: string
  let secondarySub: string
  if (group === 'clientes') {
    title = `${item.nombre || ''} ${item.apellido || ''}`.trim() || 'Cliente'
    primarySub = item.email || ''
    secondarySub = [item.documento && `Doc: ${item.documento}`, item.telefono && `Tel: ${item.telefono}`]
      .filter(Boolean)
      .join(' · ')
  } else if (group === 'vehiculos') {
    title = item.placa || 'Vehículo'
    primarySub = `${item.marca || ''} ${item.modelo || ''}`.trim()
    secondarySub = item.anio ? `Modelo ${item.anio}` : ''
  } else if (group === 'órdenes') {
    title = `Orden #${item.id}`
    primarySub = item.cliente || 'Sin cliente asignado'
    secondarySub = item.vehiculo_placa ? `Placa: ${item.vehiculo_placa}` : ''
  } else if (group === 'citas') {
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

  return { title, primarySub, secondarySub }
}
