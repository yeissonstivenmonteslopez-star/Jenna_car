import { useEffect, useId, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { calendarDateKey, calendarDateLabel, calendarMonth, shiftCalendarMonth, validCalendarDate } from '@/lib/calendar'
import type { CalendarEvent } from '@/lib/calendar'

type Props = {
  events?: CalendarEvent[]
  defaultExpanded?: boolean
  onSelectDate?: (date: string) => void
  value?: string
  disablePast?: boolean
  disabled?: boolean
  eventsLoading?: boolean
  eventsError?: string
}

const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const weekdayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default function NotchCalendarCard({ events = [], defaultExpanded = false, onSelectDate,
  value, disablePast = false, disabled = false, eventsLoading = false, eventsError = '',
}: Props) {
  const id = useId()
  const [today, setToday] = useState(calendarDateKey)
  const [month, setMonth] = useState(() => (validCalendarDate(value || '') || calendarDateKey()).slice(0, 7))
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [selection, setSelection] = useState('')
  const selected = value ?? selection
  const { year, label, cells } = calendarMonth(month)
  useEffect(() => {
    const refresh = () => setToday(calendarDateKey())
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  const agenda = useMemo(() => events.map((event) => ({ ...event, key: validCalendarDate(event.date) }))
    .filter((event) => event.key).sort((a, b) => a.key.localeCompare(b.key)), [events])
  const todayCount = agenda.filter((event) => event.key === today).length
  const next = agenda.find((event) => event.key > today)

  function select(date: string) {
    if (disabled || (disablePast && date < today)) return
    setSelection(date)
    setExpanded(false)
    onSelectDate?.(date)
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key]
    if (delta === undefined) return
    event.preventDefault()
    const target = new Date(`${date}T12:00:00Z`)
    target.setUTCDate(target.getUTCDate() + delta)
    const key = target.toISOString().slice(0, 10)
    if ((disablePast && key < today) || key.slice(0, 7) !== month) return
    document.getElementById(`${id}-${key}`)?.focus()
  }

  return <section className="jc-calendar-card" data-year={year} aria-label="Seleccionar día de la cita">
    <i className="corner c1" aria-hidden="true" /><i className="corner c2" aria-hidden="true" />
    <input id={id} type="checkbox" className="input-expand" checked={expanded}
      onChange={(event) => setExpanded(event.target.checked)} aria-label="Mostrar calendario"
      aria-expanded={expanded} aria-controls={`${id}-days`} />
    <header className="header">
      <label htmlFor={id} className="expand-control"><CalendarDays size={17} aria-hidden="true" /><span>{expanded ? label : selected ? new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${selected}T12:00:00Z`)) : 'Elegir fecha'}</span><ChevronDown className="expand-chevron" size={16} aria-hidden="true" /></label>
    </header>
    <div className="body" id={`${id}-days`} inert={!expanded} aria-hidden={!expanded}>
      <div className="calendar-content">
        <div className="month-navigation">
          <button type="button" onClick={() => setMonth(shiftCalendarMonth(month, -1))} aria-label="Mes anterior" disabled={disabled || (disablePast && month <= today.slice(0, 7))}><ChevronLeft size={18} /></button>
          <span aria-live="polite">{label} {year}</span>
          <button type="button" onClick={() => setMonth(shiftCalendarMonth(month, 1))} aria-label="Mes siguiente" disabled={disabled}><ChevronRight size={18} /></button>
        </div>
        <div className="calendar-grid" role="group" aria-label={`Días de ${label} de ${year}`}>
          {weekdays.map((day, index) => <abbr key={day} className="day" title={weekdayNames[index]}>{day}</abbr>)}
          {cells.map((date, index) => {
            if (!date) return <span key={`blank-${index}`} aria-hidden="true" />
            const matches = agenda.filter((event) => event.key === date)
            const tooltip = matches.map((event) => `${event.title}${event.plate ? ` · ${event.plate}` : ''}`).join('\n')
            return <button id={`${id}-${date}`} key={date} type="button"
              className={`date${date === today ? ' today' : ''}${matches.length ? ' event' : ''}`}
              disabled={disabled || (disablePast && date < today)} aria-pressed={date === selected}
              aria-current={date === today ? 'date' : undefined}
              aria-label={`${calendarDateLabel(date)}${matches.length ? `, ${tooltip}` : ''}`}
              data-tooltip={tooltip || undefined} onClick={() => select(date)} onKeyDown={(event) => moveFocus(event, date)}>
              {Number(date.slice(-2))}
            </button>
          })}
        </div>
        <div className="calendar-legend"><span><i /> Hoy</span><span><i /> Tu cita</span>
          <button type="button" disabled={disabled} onClick={() => setMonth(today.slice(0, 7))}>Ir a hoy</button>
        </div>
      </div>
    </div>
    <footer className="footer">
      <p className="calendar-selection" aria-live="polite">{selected ? calendarDateLabel(selected) : 'Elige el día de tu visita'}</p>
      {eventsLoading ? <p className="event-entry">Consultando tu agenda…</p> : eventsError ? <p className="event-entry">No se pudo consultar tu agenda.</p> : <>
        <div className="event-entry"><span className="event-date">Hoy</span><span>{todayCount ? `${todayCount} cita${todayCount === 1 ? '' : 's'} programada${todayCount === 1 ? '' : 's'}` : 'Sin citas programadas'}</span></div>
        {next && <div className="event-entry"><span className="event-date">{next.key.slice(8)}/{next.key.slice(5, 7)}</span><span><strong>Próxima cita</strong>{next.title}{next.plate ? ` · ${next.plate}` : ''}</span></div>}
      </>}
    </footer>
  </section>
}
