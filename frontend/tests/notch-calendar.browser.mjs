// Browser regression against Docker. APIs are mocked; no appointments are created.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.install({ time: new Date('2026-11-16T15:00:00Z') })
  await page.addInitScript(() => {
    localStorage.setItem('jenna_car_token', 'calendar-test')
    localStorage.setItem('jenna_car_user', JSON.stringify({ nombre: 'Prueba', rol: 'usuario' }))
  })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  let availabilityDate
  let submitted
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    let body = { data: [] }
    if (url.pathname === '/api/vehiculos') body = { data: [{ id: 1, marca: 'Toyota', modelo: 'Corolla', placa: 'ABC123' }] }
    if (url.pathname === '/api/services') body = { data: [{ id: 1, name: 'Mantenimiento', duration_minutes: 60, price: 100000 }] }
    if (url.pathname === '/api/citas/mis-citas') body = { data: [
      { fecha: '2026-11-17', estado: 'confirmada', servicio: { name: 'Revisión de frenos' }, vehiculo: { placa: 'ABC123' } },
      { fecha: '2026-11-18', estado: 'cancelada', servicio: { name: 'Cancelada' } },
    ] }
    if (url.pathname === '/api/citas/disponibilidad') {
      availabilityDate = url.searchParams.get('fecha')
      assert.equal(url.searchParams.get('servicio_id'), '1')
      body = { data: [{ hora: '08:00', disponible: true }, { hora: '09:00', disponible: false }] }
    }
    if (url.pathname === '/api/citas' && route.request().method() === 'POST') {
      submitted = route.request().postDataJSON()
      body = { data: { id: 123 } }
    }
    await route.fulfill({ json: body })
  })
  await page.goto(`${process.env.TEST_ORIGIN || 'http://localhost'}/citas`)
  const card = page.locator('.jc-calendar-card')
  await card.waitFor()
  assert.equal(await card.locator('.input-expand').isChecked(), false)
  const compactHeight = await card.evaluate((element) => element.getBoundingClientRect().height)
  assert(compactHeight < 80)
  await card.locator('.expand-control').click()
  await card.locator('.date.event').waitFor()
  assert.equal(await card.getAttribute('data-year'), '2026')
  assert.equal(await card.locator('.date.today').innerText(), '16')
  assert.equal(await card.locator('.date.event').count(), 1)
  assert.match(await card.locator('.date.event').getAttribute('data-tooltip'), /ABC123/)
  assert.equal(await card.getByRole('button', { name: '15 de noviembre de 2026', exact: true }).isDisabled(), true)
  const selected = card.getByRole('button', { name: /17 de noviembre de 2026/, includeHidden: true })
  await selected.click()
  await page.getByRole('button', { name: '08:00 Disponible', exact: true }).waitFor()
  assert.equal(availabilityDate, '2026-11-17')
  assert.equal(await selected.getAttribute('aria-pressed'), 'true')
  assert.equal(await card.locator('.input-expand').isChecked(), false)
  assert.match(await card.locator('.expand-control').innerText(), /17/)
  await card.locator('.expand-control').click()
  await selected.press('ArrowRight')
  assert.match(await page.locator(':focus').getAttribute('aria-label'), /18 de noviembre/)
  await card.getByRole('button', { name: 'Mes siguiente' }).click()
  await card.getByRole('button', { name: 'Mes siguiente' }).click()
  assert.equal(await card.getAttribute('data-year'), '2027')
  await card.getByRole('button', { name: 'Ir a hoy' }).click()
  await card.locator('.expand-control').click()
  assert.equal(await card.locator('.input-expand').isChecked(), false)
  assert.equal(await card.locator('.body').getAttribute('inert'), '')
  await card.locator('.expand-control').click()
  await mkdir(new URL('../../output/', import.meta.url), { recursive: true })
  for (const theme of ['light', 'dark']) {
    const toggle = page.getByRole('switch', { name: 'Modo oscuro', exact: true })
    if ((await toggle.isChecked()) !== (theme === 'dark')) await toggle.click()
    for (const width of [1280, 360]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.clock.runFor(400)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      assert.equal(await card.locator('.body').evaluate((element) => element.scrollHeight <= element.clientHeight + 1), true)
      await page.screenshot({ path: new URL(`../../output/calendar-${theme}-${width}.png`, import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
    }
  }
  await selected.click()
  assert.equal(await card.locator('.input-expand').isChecked(), false)
  await card.screenshot({ path: new URL('../../output/calendar-compact.png', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') })
  await page.getByRole('button', { name: '08:00 Disponible', exact: true }).click()
  await page.getByRole('button', { name: /SOLICITAR CITA/ }).click()
  await page.locator('.alert-keycap--success').waitFor()
  assert.equal(submitted.fecha, '2026-11-17')
  assert.equal(submitted.hora, '08:00')
  assert.equal(submitted.vehiculo_id, 1)
  assert.equal(submitted.servicio_id, 1)
  assert.deepEqual(errors, [])
  console.log('PASS: fechas, marcas reales, filtros, navegación, teclado, pliegue, temas, móvil y envío de cita conservado.')
} finally { await browser.close() }
