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

export type DashboardData = {
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

