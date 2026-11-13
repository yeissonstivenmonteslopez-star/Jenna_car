export type Vehicle = {
  id: number
  cliente_id: number
  cliente?: { id: number; nombre: string; apellido: string; email: string } | null
  placa: string
  marca: string
  modelo: string
  anio: number | null
  color: string | null
  kilometraje: number
  tipo_combustible: string
  estado: string
}

export type ClientOption = {
  id: number
  nombre: string
  apellido: string
  email: string
}

export type VehicleForm = {
  cliente_id: string
  placa: string
  marca: string
  modelo: string
  anio: string
  color: string
  kilometraje: string
  tipo_combustible: string
  estado: string
}
