import { Check, Clock3, LoaderCircle, Sunrise, Sun } from 'lucide-react'

export default function AppointmentTimePicker({ date, value, available, loading, error, onChange, onRetry }: {
  date: string; value: string; available: string[]; loading: boolean; error: string;
  onChange: (value: string) => void; onRetry: () => void
}) {
  return <section className="appointment-times" aria-label="Horarios de la cita" aria-busy={loading}>
    <div className="appointment-times-heading"><h2><Clock3 size={16} /> Elige la hora</h2>{date && !loading && !error && <span>{available.length} horarios disponibles</span>}</div>
    {!date ? <p className="appointment-times-message">Selecciona una fecha para consultar los horarios.</p> : loading ? <p className="appointment-times-message" role="status"><LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" /> Consultando disponibilidad…</p> : error ? <div role="alert" className="appointment-times-message"><p>{error}</p><button type="button" onClick={onRetry}>Reintentar</button></div> : <>
      {[{ label: 'Mañana', hours: [8, 9, 10, 11], Icon: Sunrise }, { label: 'Tarde', hours: [12, 13, 14, 15, 16, 17, 18], Icon: Sun }].map(({ label, hours, Icon }) => <fieldset key={label}><legend><Icon size={14} />{label}</legend><div className="appointment-time-grid">{hours.map((hour) => {
        const slot = `${String(hour).padStart(2, '0')}:00`
        const free = available.includes(slot)
        const selected = value === slot
        return <button type="button" key={slot} disabled={!free} aria-label={`${slot} ${free ? 'Disponible' : 'Sin cupo'}`} aria-pressed={selected} onClick={() => onChange(slot)} className={`appointment-time ${selected ? 'is-selected' : ''}`}><span>{slot}{selected && <Check size={13} />}</span><small>{selected ? 'Seleccionada' : free ? 'Disponible' : 'Sin cupo'}</small></button>
      })}</div></fieldset>)}
      {available.length === 0 && <p role="status" className="appointment-times-message">No quedan cupos para esta fecha y servicio. Elige otro día.</p>}
      {value && <p className="appointment-time-selection" role="status">Hora seleccionada: <strong>{value}</strong></p>}
    </>}
  </section>
}
