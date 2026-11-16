// UI contract test: all API responses are simulated; no real payments or email.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) })
let paid = false
const errors = []
async function createPage(role) {
  const context = await browser.newContext({ viewport: { width: 360, height: 900 } })
  await context.addInitScript((role) => {
    localStorage.setItem('jenna_car_token', 'test-only')
    localStorage.setItem('jenna_car_user', JSON.stringify({ nombre: 'Prueba', rol: role }))
  }, role)
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    let body = { data: [] }
    const title = role === 'admin' ? 'Pago simulado recibido' : 'Pago simulado exitoso'
    if (url.pathname === '/api/auth/me') body = { user: { id: 1, nombre: 'Prueba', rol: role } }
    if (url.pathname === '/api/admin/dashboard') body = { data: { citas_recientes: [], citas_hoy: 0, recibos_pagados: 1 } }
    if (url.pathname === '/api/pagos/config') body = { data: { simulacion: true } }
    if (url.pathname === '/api/recibos/mis-recibos') body = { data: [{ id: 1, orden_id: 2, fecha_ingreso: '2026-11-16', vehiculo: { id: 1, marca: 'Toyota', modelo: 'Corolla', placa: 'ABC123' }, estado: paid ? 'pagado' : 'pendiente', total: 15000, subtotal: 15000 }] }
    if (url.pathname === '/api/pagos/simulados') {
      const payload = route.request().postDataJSON()
      assert.equal(payload.resultado, 'aprobado')
      assert.equal(payload.metodo, 'nequi')
      paid = true
      body = { data: { id: 1, estado: 'completado', monto: 15000, referencia: 'SIM-BROWSER', simulacion: true } }
    }
    if (url.pathname === '/api/notificaciones/no-leidas/count') body = { no_leidas: paid ? 1 : 0 }
    if (url.pathname === '/api/notificaciones') body = { data: paid ? [{ id: 1, titulo: title, mensaje: 'Recibo #1. Simulación: no se ha cobrado dinero real.', leida: false, link: role === 'admin' ? '/admin/orders' : '/mis-recibos', tipo: 'pago', created_at: '2026-11-16T15:00:00Z' }] : [] }
    await route.fulfill({ json: body })
  })
  return page
}
try {
  const origin = process.env.TEST_ORIGIN || 'http://localhost'
  const client = await createPage('usuario')
  await client.goto(origin + '/mis-recibos')
  await client.getByRole('button', { name: 'Simular pago', exact: true }).click()
  await client.getByRole('button', { name: 'Nequi simulado', exact: true }).click()
  await client.getByRole('button', { name: 'Simular pago · sin dinero real', exact: true }).click()
  await client.getByText('Pago simulado exitoso', { exact: true }).waitFor()
  await client.getByRole('button', { name: 'Cerrar', exact: true }).click()
  const clientBell = client.getByRole('button', { name: 'Notificaciones', exact: true })
  await clientBell.locator('span').waitFor()
  await clientBell.click()
  await client.getByText('Pago simulado exitoso', { exact: true }).waitFor()
  const admin = await createPage('admin')
  await admin.goto(origin + '/admin/dashboard')
  await admin.locator('.admin-topbar .notification-trigger').waitFor()
  const controlsSeparated = await admin.evaluate(() => {
    const bell = document.querySelector('.admin-topbar .notification-trigger').getBoundingClientRect()
    const theme = document.querySelector('.workspace-theme-toggle').getBoundingClientRect()
    return bell.right <= theme.left
  })
  assert.equal(controlsSeparated, true)
  await admin.getByRole('button', { name: 'Notificaciones', exact: true }).click()
  await admin.getByText('Pago simulado recibido', { exact: true }).waitFor()
  const output = new URL('../../output/', import.meta.url)
  await mkdir(output, { recursive: true })
  for (const [label, page] of [['client', client], ['admin', admin]]) {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: fileURLToPath(new URL(`payment-notification-${label}.png`, output)), fullPage: true })
  }
  assert.deepEqual(errors, [])
  console.log('PASS: éxito visible, refresco de campana del cliente y aviso del administrador; móvil sin desbordamientos.')
} finally { await browser.close() }
