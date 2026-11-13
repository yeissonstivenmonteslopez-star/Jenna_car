import { CarFront, Clock3 } from 'lucide-react'
import type { VehicleOption, ServiceOption } from './bookingTypes'
import { formatDuration } from './bookingPresentation'

type Props = { selectedVehicle: VehicleOption | null; selectedService: ServiceOption | null; appointmentDate: string; appointmentTime: string }
export default function BookingSummary({ selectedVehicle, selectedService, appointmentDate, appointmentTime }: Props) {
  return (
<aside className="rounded-[28px] border border-red-500/20 bg-[#141414] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
                <CarFront size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Resumen</p>
                <h2 className="font-serif text-2xl text-white">Tu cita</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-red-500/20 bg-[#1b1b1b] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Vehículo</p>
                <p className="mt-2 text-base font-medium text-white">
                  {selectedVehicle ? `${selectedVehicle.marca} ${selectedVehicle.modelo}` : 'Añadir vehículo'}
                </p>
                <p className="mt-1 text-sm text-white/60">{selectedVehicle ? selectedVehicle.placa : 'Pendiente'}</p>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-[#1b1b1b] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Servicio</p>
                <p className="mt-2 text-base font-medium text-white">
                  {selectedService ? selectedService.name : 'Sin seleccionar'}
                </p>
                <p className="mt-1 text-sm text-white/60">
                  {selectedService?.duration_minutes ? formatDuration(selectedService.duration_minutes) : 'Personalizado'}
                </p>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-[#1b1b1b] p-4">
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/55">
                  <Clock3 size={12} /> Disponibilidad
                </p>
                <p className="mt-2 text-sm text-white/75">{appointmentDate && appointmentTime ? `${appointmentDate} a las ${appointmentTime}` : 'Selecciona un día y una hora para continuar.'}</p>
              </div>
            </div>


          </aside>
  )
}
