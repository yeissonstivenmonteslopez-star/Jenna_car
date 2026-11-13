// Delay real route-module loading and fixture registration; no real accounts or email.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) })
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5180'
const errors = []
await mkdir('.test-tmp-design', { recursive: true })

try {
  for (const theme of ['light', 'dark']) {
    // Use the opposite OS theme to verify that the saved workspace theme wins.
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme === 'light' ? 'dark' : 'light' })
    await context.addInitScript((value) => {
      localStorage.setItem('jenna_car_theme', value)
      localStorage.setItem('jenna_car_token', 'fixture-token')
      localStorage.setItem('jenna_car_user', JSON.stringify({ id: 1, nombre: 'Ana', rol: 'usuario' }))
    }, theme)
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    let release
    const pending = new Promise((resolve) => { release = resolve })
    await page.route('**/src/routes/AppRoutes.tsx*', async (route) => { await pending; await route.continue() })
    await page.route('**/api/**', (route) => route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ data: [] }) }))
    try {
      await page.goto(`${origin}/mis-citas`, { waitUntil: 'domcontentloaded' })
      const loader = page.getByRole('status', { name: 'Cargando JENNACAR…' })
      await loader.waitFor()
      const metrics = await loader.evaluate((element) => {
        const box = element.getBoundingClientRect()
        const wheel = element.querySelector('.wheel-and-hamster')
        return {
          width: box.width, height: box.height, top: box.top, left: box.left,
          background: getComputedStyle(element).backgroundColor,
          wheelWidth: wheel.getBoundingClientRect().width,
          wheelHeight: wheel.getBoundingClientRect().height,
          animation: getComputedStyle(element.querySelector('.hamster')).animationName,
          duration: getComputedStyle(element.querySelector('.hamster')).animationDuration,
        }
      })
      assert.deepEqual([metrics.width, metrics.height, metrics.top, metrics.left], [1280, 900, 0, 0])
      assert.equal(metrics.background, theme === 'dark' ? 'rgba(10, 10, 10, 0.9)' : 'rgba(255, 255, 255, 0.9)')
      assert.deepEqual([metrics.wheelWidth, metrics.wheelHeight], [168, 168])
      assert.equal(metrics.animation, 'hamster')
      assert.equal(metrics.duration, '1s')
      await page.screenshot({ path: `.test-tmp-design/loader-${theme}-desktop.png` })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      assert.equal(await page.locator('.hamster').evaluate((element) => getComputedStyle(element).animationName), 'none')
      await page.setViewportSize({ width: 390, height: 844 })
      await loader.waitFor({ state: 'detached' })
      assert.equal(await page.locator('.wheel-and-hamster').count(), 0)
      await page.setViewportSize({ width: 768, height: 900 })
      await loader.waitFor()
      release()
      await loader.waitFor({ state: 'detached' })
      await page.getByRole('heading', { name: 'Mis citas', exact: true }).waitFor()
    } finally { release(); await context.close() }
  }

  const page = await browser.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  let release
  const pending = new Promise((resolve) => { release = resolve })
  await page.route('**/api/auth/register', async (route) => {
    await pending
    await route.fulfill({ status: 409, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'El correo ya está registrado' }) })
  })
  await page.goto(`${origin}/register`)
  for (const [name, value] of Object.entries({ nombre: 'Ana', apellido: 'QA', telefono: '3001234567', email: 'qa@example.invalid', password: 'Prueba123456', confirmation: 'Prueba123456' })) {
    await page.locator(`[name="${name}"]`).fill(value)
  }
  await page.getByRole('button', { name: 'CREAR CUENTA' }).click()
  const loader = page.getByRole('status', { name: 'Creando tu cuenta' })
  await loader.waitFor()
  assert.equal(await loader.locator('.wheel-and-hamster').count(), 1)
  assert.equal(await page.getByRole('button', { name: 'CREANDO…' }).isDisabled(), true)
  await page.setViewportSize({ width: 390, height: 844 })
  await loader.waitFor({ state: 'detached' })
  assert.equal(await page.locator('.wheel-and-hamster').count(), 0)
  assert.equal(await page.getByRole('button', { name: 'CREANDO…' }).isDisabled(), true)
  release()
  await loader.waitFor({ state: 'detached' })
  await page.getByText('El correo ya está registrado', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'CREAR CUENTA' }).isEnabled(), true)
  assert.deepEqual(errors, [])
  console.log('PASS: real Suspense loading, saved light/dark themes, desktop-only overlay, original animation, reduced motion and registration failure cleanup.')
} finally { await browser.close() }
