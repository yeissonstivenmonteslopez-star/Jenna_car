export type CalendarEvent = { date: string | Date; title: string; plate?: string }

export function calendarDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function validCalendarDate(value: string | Date): string {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : calendarDateKey(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : ''
}

export function calendarMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(Date.UTC(year, monthNumber - 1, 1))
  const leading = (first.getUTCDay() + 6) % 7
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const cells: Array<string | null> = Array(leading).fill(null)
  for (let day = 1; day <= count; day++) cells.push(`${month}-${String(day).padStart(2, '0')}`)
  while (cells.length % 7) cells.push(null)
  const label = new Intl.DateTimeFormat('es-CO', { month: 'long', timeZone: 'UTC' }).format(first)
  return { year, label: label[0].toUpperCase() + label.slice(1), cells }
}

export function shiftCalendarMonth(month: string, direction: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthNumber - 1 + direction, 1)).toISOString().slice(0, 7)
}

export function calendarDateLabel(value: string) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}
