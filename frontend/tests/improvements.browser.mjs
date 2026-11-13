// Run against Vite with Playwright installed, or set PLAYWRIGHT_MODULE to its entrypoint.
// All API responses below are fake: this browser test never modifies MySQL.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) })
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
await context.addInitScript(() => {
  localStorage.setItem('jenna_car_token', 'fake-test-token')
  localStorage.setItem('jenna_car_user', JSON.stringify({ nombre: 'Prueba', rol: 'usuario' }))
})
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
let methodPayload
let receiptState = 'pendiente'
const vehicle = { id: 1, marca: 'Toyota', modelo: 'Corolla', placa: 'ABC123' }
await page.route('**/api/**', async (route) => {
  const request = route.request()
  const url = new URL(request.url())
  let body = { data: [] }
  if (url.pathname === '/api/vehiculos') body = { data: [vehicle] }
  if (url.pathname === '/api/services') body = { data: [{ id: 1, name: 'Mantenimiento', price: 15000, duration_minutes: 90 }] }
  if (url.pathname === '/api/citas/disponibilidad') {
    assert.equal(url.searchParams.get('servicio_id'), '1')
    body = { data: Array.from({ length: 11 }, (_, index) => ({ hora: `${String(index + 8).padStart(2, '0')}:00`, disponible: index !== 2 })) }
  }
  if (url.pathname === '/api/recibos/mis-recibos') body = { data: [{ id: 1, orden_id: 1, estado: receiptState, total: 15000, subtotal: 15000, descuento: 0, vehiculo: vehicle, fecha_ingreso: '2030-01-01' }] }
  if (url.pathname === '/api/pagos/simulados') {
    methodPayload = request.postDataJSON()
    assert.deepEqual(Object.keys(methodPayload).sort(), ['franquicia', 'idempotencia', 'metodo', 'recibo_id', 'resultado'])
    receiptState = methodPayload.resultado === 'aprobado' ? 'pagado' : 'pendiente'
    body = { data: { id: 1, simulacion: true, monto: 15000, estado: methodPayload.resultado === 'aprobado' ? 'completado' : methodPayload.resultado === 'rechazado' ? 'anulado' : 'pendiente', referencia: 'SIM-BROWSER-TEST' } }
  }
  if (url.pathname === '/api/ordenes/mis-ordenes') body = { data: [{ id: 1, fecha_ingreso: '2030-01-01', problema_reportado: 'Revisión de frenos', observaciones: 'Inspección en curso', estado: 'en_reparacion', estado_aprobacion: 'aprobado', vehiculo: vehicle, total: 15000, recibo: null, servicios: [], trabajos: [{ id: 1, descripcion: 'Cambio de pastillas', estado: 'en_proceso', updated_at: '2030-01-01T14:00:00Z', cantidad: 1, subtotal: 15000, diagnostico: { descripcion: 'Desgaste de pastillas', observaciones: 'Repuestos recibidos', solucion_recomendada: null }, imagenes: [] }] }] }
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) })
})
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173'
const output = new URL('../../.test-tmp-ui/', import.meta.url)
await mkdir(output, { recursive: true })
try {
  await page.goto(`${origin}/citas`)
  await page.locator('#fechaCita').fill('2030-01-02')
  const occupied = page.getByRole('button', { name: '10:00 Sin cupo' })
  await occupied.waitFor()
  assert.equal(await occupied.isDisabled(), true)
  assert.equal(await page.getByRole('button', { name: '11:00 Disponible' }).isEnabled(), true)
  assert.equal(await page.getByRole('group', { name: 'Mañana', exact: true }).count(), 1)
  assert.equal(await page.getByRole('group', { name: 'Tarde', exact: true }).count(), 1)
  assert.equal(await page.getByRole('button', { name: 'SOLICITAR CITA' }).isDisabled(), true)
  await page.getByRole('button', { name: '11:00 Disponible' }).click()
  assert.equal(await page.getByRole('button', { name: '11:00 Disponible' }).getAttribute('aria-pressed'), 'true')
  assert.equal(await page.getByRole('button', { name: 'SOLICITAR CITA' }).isEnabled(), true)
  await page.getByRole('button', { name: 'Modo oscuro', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForFunction(() => getComputedStyle(document.querySelector('select')).backgroundColor === 'rgb(28, 28, 28)')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: new URL('horarios-dark-mobile.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  await page.getByRole('button', { name: 'Modo claro', exact: true }).click()
  await page.setViewportSize({ width: 1280, height: 1000 })
  await page.screenshot({ path: new URL('citas.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  await page.goto(`${origin}/mis-recibos`)
  await page.getByRole('button', { name: 'Simular pago', exact: true }).click()
  await page.getByRole('button', { name: 'Visa de prueba' }).click()
  await page.getByLabel('Vencimiento de prueba').fill('12/39')
  await page.getByLabel('Código ficticio').fill('123')
  await page.screenshot({ path: new URL('pasarela.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  await page.getByRole('button', { name: 'Simular pago · sin dinero real' }).click()
  await page.getByRole('heading', { name: 'Simulación aprobada' }).waitFor()
  assert.equal(methodPayload.franquicia, 'visa')
  assert.equal(methodPayload.metodo, 'tarjeta')
  await page.goto(`${origin}/mis-reparaciones`)
  await page.getByRole('heading', { name: 'Seguimiento de mi vehículo' }).waitFor()
  await page.getByText('Repuestos recibidos', { exact: true }).waitFor()
  assert.equal(await page.locator('[aria-current="step"]').innerText(), 'En reparación\nEstado actual')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: new URL('seguimiento-mobile.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  assert.deepEqual(errors, [])
  console.log('Browser checks passed: disabled slots, simulated checkout payload/result, real-state followup and mobile width.')
} finally { await context.close(); await browser.close() }
