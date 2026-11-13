import type { VehicleOption } from './bookingTypes'

type Props = {
  vehicles: VehicleOption[]; selectedVehicleId: string; showNewVehicleForm: boolean
  setSelectedVehicleId: (value: string) => void; setShowNewVehicleForm: (value: boolean) => void
}
export default function BookingVehicleFields({ vehicles, selectedVehicleId, showNewVehicleForm, setSelectedVehicleId, setShowNewVehicleForm }: Props) {
  return (
<div className="grid gap-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Vehículo</p>
                {vehicles.length > 0 ? (
                  <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">
                    <span>Selecciona tu coche</span>
                    <select
                      value={showNewVehicleForm ? 'new' : selectedVehicleId}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        const isNewVehicle = nextValue === 'new'
                        setShowNewVehicleForm(isNewVehicle)
                        setSelectedVehicleId(isNewVehicle ? 'new' : nextValue)
                      }}
                      className="rounded-2xl border border-red-500/30 bg-[#1d1d1d] px-4 py-3.5 text-sm text-white outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/30"
                    >
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id} className="bg-[#1d1d1d] text-white">
                          {vehicle.marca} {vehicle.modelo} · {vehicle.placa}
                        </option>
                      ))}
                      <option value="new" className="bg-[#1d1d1d] text-white">Registrar otro vehículo</option>
                    </select>
                  </label>
                ) : null}

                {(showNewVehicleForm || vehicles.length === 0) && (
                  <div className="grid gap-3 rounded-2xl border border-dashed border-red-500/30 bg-[#171717] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">Nuevo vehículo</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input name="placa" required placeholder="Placa" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-red-400" />
                      <input name="marca" required placeholder="Marca" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-red-400" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input name="modelo" required placeholder="Modelo" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-red-400" />
                      <input name="anio" type="number" placeholder="Año" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-red-400" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input name="color" placeholder="Color" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-red-400" />
                      <input name="kilometraje" type="number" min="0" placeholder="Kilometraje" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-red-400" />
                    </div>
                    <select name="tipo_combustible" className="rounded-xl border border-red-500/20 bg-[#0f0f0f] px-4 py-3 text-sm text-white outline-none transition focus:border-red-400">
                      <option value="gasolina" className="bg-[#0f0f0f] text-white">Gasolina</option>
                      <option value="diesel" className="bg-[#0f0f0f] text-white">Diesel</option>
                      <option value="hibrido" className="bg-[#0f0f0f] text-white">Híbrido</option>
                      <option value="electrico" className="bg-[#0f0f0f] text-white">Eléctrico</option>
                      <option value="gas" className="bg-[#0f0f0f] text-white">Gas</option>
                    </select>
                  </div>
                )}
              </div>
  )
}
