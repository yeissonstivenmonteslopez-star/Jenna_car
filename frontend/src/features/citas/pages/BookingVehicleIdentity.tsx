import { useId, useState } from 'react'

const catalog = [
  { brand: 'Chevrolet', models: ['Spark', 'Aveo', 'Sail', 'Onix', 'Tracker'] },
  { brand: 'Renault', models: ['Logan', 'Sandero', 'Duster', 'Kwid', 'Stepway'] },
  { brand: 'Kia', models: ['Picanto', 'Rio', 'Sportage', 'Soluto'] },
  { brand: 'Mazda', models: ['Mazda 2', 'Mazda 3', 'CX-30', 'CX-5'] },
  { brand: 'Toyota', models: ['Corolla', 'Hilux', 'Fortuner', 'Prado', 'Yaris'] },
  { brand: 'Nissan', models: ['March', 'Versa', 'Kicks', 'Frontier'] },
  { brand: 'Hyundai', models: ['i10', 'Accent', 'Tucson', 'Creta'] },
  { brand: 'Suzuki', models: ['Swift', 'Vitara', 'Jimny'] },
  { brand: 'Ford', models: ['Fiesta', 'EcoSport', 'Escape', 'Ranger'] },
  { brand: 'Volkswagen', models: ['Gol', 'Polo', 'Jetta', 'T-Cross'] },
]

function formatPlate(value: string) {
  let plate = ''
  for (const character of value.toUpperCase()) {
    const allowed = plate.length < 3 ? /[A-Z]/ : /[0-9]/
    if (allowed.test(character)) plate += character
    if (plate.length === 6) break
  }
  return plate
}

export default function BookingVehicleIdentity({ className }: { className: string }) {
  const id = useId()
  const [brand, setBrand] = useState('')
  const match = catalog.find(item => item.brand.toLowerCase() === brand.trim().toLowerCase())
  const models = match?.models ?? (brand.trim() ? [] : catalog.flatMap(item => item.models))

  return <>
    <input name="placa" aria-label="Placa" placeholder="ABC123" required pattern="[A-Z]{3}[0-9]{3}"
      title="Escribe tres letras seguidas de tres números, por ejemplo ABC123" className={className}
      onChange={event => { event.currentTarget.value = formatPlate(event.currentTarget.value) }} />
    <input name="marca" aria-label="Marca" placeholder="Marca" required list={id + '-brands'}
      value={brand} onChange={event => setBrand(event.target.value)} className={className} />
    <datalist id={id + '-brands'}>{catalog.map(item => <option key={item.brand} value={item.brand} />)}</datalist>
    <input name="modelo" aria-label="Modelo" placeholder="Modelo" required list={id + '-models'} className={className} />
    <datalist id={id + '-models'}>{models.map(model => <option key={model} value={model} />)}</datalist>
  </>
}
