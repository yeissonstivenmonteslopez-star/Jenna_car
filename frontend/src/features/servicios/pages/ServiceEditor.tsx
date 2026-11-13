import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { PencilLine, Plus, Sparkles } from 'lucide-react'

export type ServiceForm = {
  nombre: string
  descripcion: string
  precio: string
  duracion_horas: string
  duracion_minutos: string
  estado: string
}
export const estadoOptions = ['activo', 'inactivo']

type Props = {
  form: ServiceForm; setForm: Dispatch<SetStateAction<ServiceForm>>
  selectedId: number | null; resetForm: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}
export default function ServiceEditor({ form, setForm, selectedId, resetForm, onSubmit }: Props) {
  return (
<aside className="rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#f87171]/10 p-2 text-[#f87171]">
                  {selectedId ? <PencilLine size={18} /> : <Plus size={18} />}
                </div>
                <h2 className="font-serif text-2xl text-white">{selectedId ? `Editar #${selectedId}` : 'Nuevo'}</h2>
              </div>
              {selectedId && (
                <button type="button" onClick={resetForm} className="text-xs uppercase tracking-[0.18em] text-[#f87171]">Cancelar edición</button>
              )}
            </div>

            <form onSubmit={onSubmit} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                Nombre
                <input
                  required
                  value={form.nombre}
                  onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                  className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                />
              </label>

              <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                Descripción
                <textarea
                  value={form.descripcion}
                  onChange={(event) => setForm({ ...form, descripcion: event.target.value })}
                  className="mt-1 min-h-[110px] rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                />
              </label>

              <div className="grid min-w-0 gap-4">
                <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                  Precio en pesos colombianos (COP)
                  <div className="mt-1 flex items-center rounded-xl border border-white/10 bg-white/5 focus-within:border-[#f87171]/60">
                    <span className="pl-3 text-sm text-white/50">COP $</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={form.precio}
                      onChange={(event) => setForm({ ...form, precio: event.target.value })}
                      className="w-full bg-transparent px-2 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                </label>

                <div className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                  <span>Duración estimada</span>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid min-w-0 gap-2 normal-case tracking-normal">
                      <span>Horas</span>
                      <input
                        aria-label="Horas de duración"
                        required
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        value={form.duracion_horas}
                        onChange={(event) => setForm({ ...form, duracion_horas: event.target.value.replace(/\D/g, '') })}
                        className="w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                      />
                    </label>
                    <label className="grid min-w-0 gap-2 normal-case tracking-normal">
                      <span>Minutos</span>
                      <input
                        aria-label="Minutos de duración"
                        required
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        value={form.duracion_minutos}
                        onChange={(event) => setForm({ ...form, duracion_minutos: event.target.value.replace(/\D/g, '') })}
                        className="w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f87171]/60"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                Estado
                <div className="mt-1 grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-1">
                  {estadoOptions.map((option) => {
                    const isActive = form.estado === option
                    const isEnabled = option === 'activo'
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setForm({ ...form, estado: option })}
                        className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${isActive ? (isEnabled ? 'bg-[#70e9d2]/15 text-[#70e9d2] shadow-sm' : 'bg-white/10 text-white/80 shadow-sm') : 'text-white/35 hover:bg-white/5 hover:text-white/70'}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${isActive ? (isEnabled ? 'bg-[#70e9d2]' : 'bg-white/50') : 'bg-white/20'}`} />
                        {isEnabled ? 'Activo' : 'Inactivo'}
                      </button>
                    )
                  })}
                </div>
              </label>

              <button type="submit" className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-red-950/50 border border-red-500/40 transition-all duration-150 active:scale-95">
                <Sparkles size={15} className="text-white" />
                {selectedId ? 'Guardar cambios' : 'Crear servicio'}
              </button>
            </form>
          </aside>
  )
}
