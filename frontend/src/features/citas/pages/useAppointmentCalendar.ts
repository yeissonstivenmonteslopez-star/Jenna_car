import { useEffect, useState } from 'react'
import type { CalendarEvent } from '@/lib/calendar'
import { getMisCitas } from '../services/citasService'

type Appointment = { fecha: string; estado: string; servicio?: { name?: string }; vehiculo?: { placa?: string } }

export function useAppointmentCalendar(enabled = true) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!enabled) return
    const token = localStorage.getItem('jenna_car_token')
    if (!token) { setLoading(false); return }
    let active = true
    setLoading(true)
    setError('')
    getMisCitas(token).then((response: { data?: Appointment[] }) => {
      if (active) setEvents((response.data || []).filter((appointment) => ['pendiente', 'confirmada'].includes(appointment.estado))
        .map((appointment) => ({ date: appointment.fecha, title: appointment.servicio?.name || 'Cita de servicio', plate: appointment.vehiculo?.placa })))
    }).catch(() => { if (active) setError('No se pudo consultar tu agenda.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [enabled])
  return { events, loading, error }
}
