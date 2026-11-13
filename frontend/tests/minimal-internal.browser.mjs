// Fixture APIs only. Verifies consolidated controls without changing real data.
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) })
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5180'
await page.addInitScript(() => {
  localStorage.setItem('jenna_car_token', 'fake')
  localStorage.setItem('jenna_car_user', JSON.stringify({ nombre: 'QA', rol: 'admin' }))
})
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
let appointmentState = 'pendiente'
let vehicle = { id: 1, cliente_id: 1, cliente: { id: 1, nombre: 'QA', apellido: 'Test', email: 'qa@example.invalid' }, marca: 'Toyota', modelo: 'Corolla', placa: 'ABC123', anio: 2020, color: 'Gris', kilometraje: 5000, tipo_combustible: 'gasolina', estado: 'activo' }
await page.route('**/api/**', async (route) => {
  const request = route.request()
  const path = new URL(request.url()).pathname
  let body = { data: [] }
  if (path === '/api/auth/me') body = { user: { id: 1, nombre: 'QA', apellido: 'Test', email: 'qa@example.invalid', telefono: '3000000000', rol: 'admin' } }
  if (path === '/api/admin/dashboard') body = { data: { usuarios: 0, clientes: 0, vehiculos: 0, citas_pendientes: 0, citas_hoy: 0, ordenes_pendientes: 0, ordenes_reparacion: 0, ordenes_terminadas: 0, recibos_pendientes: 0, recibos_pagados: 0, ingresos_totales: 0, citas_recientes: [], ordenes_recientes: [], pagos_recientes: [] } }
  if (path === '/api/admin/citas/1/estado') { appointmentState = request.postDataJSON().estado; body = { data: { id: 1, estado: appointmentState } } }
  if (path === '/api/admin/citas') body = { data: [{ id: 1, cliente: { id: 1, nombre: 'QA', apellido: 'Test' }, vehiculo: { id: 1, marca: 'Toyota', modelo: 'Corolla', placa: 'ABC123' }, servicio: { id: 1, name: 'Frenos' }, fecha: '2030-01-02', hora: '10:00', motivo: '', observaciones: '', estado: appointmentState, mecanico_id: null }] }
  if (path === '/api/admin/servicios') body = { data: [{ id: 1, nombre: 'Frenos', descripcion: 'Revisión', precio: 15000, duracion_estimada: 60, estado: 'activo' }] }
  if (path === '/api/recibos/mis-recibos') body = { data: [{ id: 1, orden_id: 1, estado: 'pendiente', total: 15000, subtotal: 15000, descuento: 0, vehiculo: { id: 1, marca: 'Toyota', modelo: 'Corolla', placa: 'ABC123' }, fecha_ingreso: '2030-01-01' }] }
  if (path === '/api/admin/vehiculos/1' && request.method() === 'PUT') { vehicle = { ...vehicle, ...request.postDataJSON() }; body = { data: vehicle } }
  if (path === '/api/admin/vehiculos') body = { data: [vehicle] }
  if (path === '/api/admin/search') body = { data: { clientes: [{ id: 1, nombre: 'QA', apellido: 'Test', email: 'qa@example.invalid' }], vehiculos: [vehicle], 'órdenes': [], citas: [], recibos: [] } }
  await route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) })
})
try {
  await page.goto(`${origin}/admin/citas`)
  await page.getByRole('button', { name: 'Cambiar', exact: true }).waitFor()
  assert.equal(await page.getByRole('heading', { name: 'Citas pendientes', exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Cambiar', exact: true }).count(), 1)
  await page.getByRole('button', { name: 'Cambiar', exact: true }).click()
  await page.locator('tbody select').last().selectOption('confirmada')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await page.getByText('Estado cambiado a confirmada', { exact: true }).waitFor()
  assert.equal(appointmentState, 'confirmada')
  await page.goto(`${origin}/admin/servicios`)
  await page.getByRole('button', { name: 'Editar', exact: true }).click()
  await page.getByRole('button', { name: 'Cancelar edición', exact: true }).click()
  await page.getByRole('button', { name: 'Cancelar edición', exact: true }).waitFor({ state: 'hidden' })
  await page.goto(`${origin}/admin/vehiculos`)
  await page.getByRole('button', { name: 'Editar', exact: true }).click()
  assert.equal(await page.getByRole('textbox', { name: 'Placa', exact: true }).inputValue(), 'ABC123')
  await page.getByRole('textbox', { name: 'Placa', exact: true }).fill('XYZ987')
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  await page.getByText('Vehículo actualizado correctamente.', { exact: true }).waitFor()
  assert.equal(vehicle.placa, 'XYZ987')
  await page.goto(`${origin}/admin/search`)
  await page.getByRole('textbox', { name: 'Buscar en clientes, vehículos, órdenes, citas y recibos' }).fill('QA')
  await page.getByText('QA Test', { exact: true }).waitFor()
  for (const path of ['/admin/dashboard', '/admin/orders', '/admin/users', '/admin/vehiculos', '/admin/search', '/admin/notificaciones', '/citas', '/mis-citas', '/notificaciones', '/mis-reparaciones', '/mis-recibos']) {
    await page.goto(`${origin}${path}`)
    await page.locator('main h1').waitFor({timeout:8000}).catch(async () => { throw new Error(path + ': ' + (await page.locator('body').innerText()) + ' ERRORS: ' + errors.join('; ')) })
    assert.equal(await page.getByRole('link', { name: /Volver al inicio|^Inicio$|^Dashboard$|← Panel|← Inicio|Volver al perfil|Busqueda avanzada/ }).count(), path.startsWith('/admin') ? 1 : 0)
  }
  await page.getByText('Documento', { exact: true }).click()
  for (const action of ['Ver recibo 1', 'Imprimir recibo 1', 'Descargar recibo 1']) assert.equal(await page.getByRole('button', { name: action, exact: true }).isVisible(), true)
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  assert.deepEqual(errors, [])
  console.log('PASS: internal pages, single appointment editor, reset form, document actions and mobile width.')
} finally { await browser.close() }
