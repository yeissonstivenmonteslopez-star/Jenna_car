import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/calendar.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { calendarDateKey, validCalendarDate, calendarMonth, shiftCalendarMonth } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('usa el día de Bogotá cerca de medianoche UTC', () => {
  assert.equal(calendarDateKey(new Date('2026-11-17T02:00:00Z')), '2026-11-16')
  assert.equal(calendarDateKey(new Date('2026-11-17T05:00:00Z')), '2026-11-17')
})

test('febrero bisiesto y semanas completas que empiezan en lunes', () => {
  const month = calendarMonth('2028-02')
  assert.equal(month.label, 'Febrero')
  assert.equal(month.cells[0], null)
  assert.equal(month.cells[1], '2028-02-01')
  assert(month.cells.includes('2028-02-29'))
  assert.equal(month.cells.length % 7, 0)
  assert.equal(calendarMonth('2027-02').cells.includes('2027-02-29'), false)
})

test('un mes que inicia en lunes no agrega una semana vacía', () => {
  const month = calendarMonth('2026-06')
  assert.equal(month.cells[0], '2026-06-01')
  assert.equal(month.cells.filter(Boolean).length, 30)
})

test('la navegación conserva el año al pasar diciembre y enero', () => {
  assert.equal(shiftCalendarMonth('2026-12', 1), '2027-01')
  assert.equal(shiftCalendarMonth('2027-01', -1), '2026-12')
})

test('rechaza fechas inexistentes y preserva las fechas sin convertirlas a UTC', () => {
  for (const date of ['2026-02-29', '2026-13-01', '2026-11-31', '', 'not-a-date']) assert.equal(validCalendarDate(date), '')
  assert.equal(validCalendarDate('2028-02-29'), '2028-02-29')
  assert.equal(validCalendarDate(new Date('invalid')), '')
})
