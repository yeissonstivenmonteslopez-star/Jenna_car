import type { Dispatch, FormEvent, SetStateAction } from 'react'
import {
  Calendar,
  CarFront,
  Fuel,
  Gauge,
  Palette,
  PencilLine,
  Plus,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import type { ClientOption, VehicleForm } from './vehicleTypes'

const combustibleOptions = [
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'diesel', label: 'Diésel' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'electrico', label: 'Eléctrico' },
  { value: 'gas', label: 'Gas (GLP/GNV)' },
]

const estadoOptions = [
  { value: 'activo', label: 'Activo' },
  { value: 'en_mantenimiento', label: 'En mantenimiento' },
  { value: 'inactivo', label: 'Inactivo' },
]

type Props = {
  form: VehicleForm
  setForm: Dispatch<SetStateAction<VehicleForm>>
  selectedId: number | null
  clients: ClientOption[]
  resetForm: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export default function VehicleEditor({
  form,
  setForm,
  selectedId,
  clients,
  resetForm,
  onSubmit,
}: Props) {
  return (
    <aside className="rounded-3xl border border-white/15 bg-[#141414] min-w-0 p-5 shadow-2xl shadow-black/50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/30 bg-red-600/15 text-red-500">
            {selectedId ? <PencilLine size={20} /> : <Plus size={22} />}
          </div>
          <div>
            <h2 className="font-serif text-2xl font-medium text-white">
              {selectedId ? `Editar #${selectedId}` : 'Nuevo Vehículo'}
            </h2>
            <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider">
              {selectedId ? 'Modifica los datos del registro' : 'Registra un auto en el taller'}
            </p>
          </div>
        </div>
        {selectedId && (
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:border-white/30 hover:bg-white/10 hover:text-white transition font-semibold"
          >
            <X size={14} /> Cancelar
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Cliente / Propietario */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
            <UserRound size={14} className="text-red-400" />
            Propietario / Cliente <strong className="text-red-500">*</strong>
          </label>
          <select
            required
            value={form.cliente_id}
            onChange={(event) => setForm({ ...form, cliente_id: event.target.value })}
            className="w-full rounded-xl border border-white/20 bg-[#1a1a1a] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-sm"
          >
            <option value="" className="bg-[#1a1a1a] text-white/60">
              {clients.length === 0 ? 'Cargando clientes...' : '— Selecciona el propietario —'}
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id} className="bg-[#1a1a1a] text-white">
                {client.nombre} {client.apellido} ({client.email})
              </option>
            ))}
          </select>
          {clients.length === 0 && (
            <span className="text-[10px] text-amber-400/80 normal-case">
              No hay clientes disponibles. Regístralos en la sección de Usuarios.
            </span>
          )}
        </div>

        {/* Placa */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
            <CarFront size={13} className="text-red-400" />
            Placa del vehículo <strong className="text-red-500">*</strong>
          </label>
          <div className="relative">
            <input
              required
              value={form.placa}
              aria-label="Placa"
              onChange={(event) =>
                setForm({
                  ...form,
                  placa: event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                    .slice(0, 6),
                })
              }
              className="w-full rounded-xl border border-white/20 bg-[#1a1a1a] px-4 py-3 text-base font-mono font-bold tracking-widest text-white uppercase placeholder:text-white/30 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-sm"
              placeholder="ABC123"
              maxLength={6}
            />
          </div>
          <span className="text-[9px] text-white/40">
            Formato: 3 letras y 3 números sin guión (ej: ABC123)
          </span>
        </div>

        {/* Marca y Modelo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Marca <strong className="text-red-500">*</strong></label>
            <input
              required
              value={form.marca}
              onChange={(event) => setForm({ ...form, marca: event.target.value })}
              className="mt-1 w-full rounded-xl border border-white/20 bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-sm"
              placeholder="Ej: Chevrolet"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Modelo <strong className="text-red-500">*</strong></label>
            <input
              required
              value={form.modelo}
              onChange={(event) => setForm({ ...form, modelo: event.target.value })}
              className="mt-1 w-full rounded-xl border border-white/20 bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-sm"
              placeholder="Ej: Onix Turbo"
            />
          </div>
        </div>

        {/* Año y Color */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
              <Calendar size={13} className="text-red-400 mr-1" /> Año
            </label>
            <input
              type="number"
              min="1900"
              max="2100"
              value={form.anio}
              onChange={(event) => setForm({ ...form, anio: event.target.value })}
              className="mt-1 w-full rounded-xl border border-white/20 bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-sm"
              placeholder="Ej: 2023"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
              <Palette size={13} className="text-red-400 mr-1" /> Color
            </label>
            <input
              value={form.color}
              onChange={(event) => setForm({ ...form, color: event.target.value })}
              className="mt-1 w-full rounded-xl border border-white/20 bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-sm"
              placeholder="Ej: Gris plata"
            />
          </div>
        </div>

        {/* Kilometraje */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
            <Gauge size={14} className="text-red-400" /> Kilometraje
          </label>
          <div className="relative">
            <input
              required
              type="number"
              min="0"
              value={form.kilometraje}
              onChange={(event) => setForm({ ...form, kilometraje: event.target.value })}
              className="w-full min-w-0 rounded-xl border border-white/20 bg-[#1a1a1a] px-3 py-3 pr-10 text-sm text-white outline-none"
              placeholder="0"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40">km</span>
          </div>
        </div>

        {/* Combustible y Estado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
              <Fuel size={13} className="text-red-400 mr-1" /> Combustible
            </label>
            <div className="min-w-0">
              <select
                value={form.tipo_combustible}
                onChange={(event) => setForm({ ...form, tipo_combustible: event.target.value })}
                className="w-full min-w-0 rounded-xl border border-white/20 bg-[#1a1a1a] px-3 py-3 pr-10 text-sm text-white outline-none capitalize"
              >
                {combustibleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#1a1a1a] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
              <ShieldCheck size={13} className="text-red-400 mr-1" /> Estado
            </label>
            <div className="min-w-0">
              <select
                value={form.estado}
                onChange={(event) => setForm({ ...form, estado: event.target.value })}
                className="w-full min-w-0 rounded-xl border border-white/20 bg-[#1a1a1a] px-3 py-3 pr-10 text-sm text-white outline-none"
              >
                {estadoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#1a1a1a] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-red-600 py-3 px-6 text-xs font-bold uppercase tracking-[0.2em] shadow-lg shadow-red-950/60 border border-red-500/40 transition-all duration-200 hover:opacity-95 active:scale-[0.96] cursor-pointer"
        >
          <CarFront size={18} className="text-white mr-2" />
          <span>{selectedId ? 'Guardar cambios' : 'Crear vehículo'}</span>
        </button>
      </form>
    </aside>
  )
}
