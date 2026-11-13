export type VehicleOption = {
  id: number
  placa: string
  marca: string
  modelo: string
  anio?: number | null
  color?: string | null
  tipo_combustible?: string
}

export type ServiceOption = {
  id: number
  name: string
  description?: string | null
  price?: number
  duration_minutes?: number
}

