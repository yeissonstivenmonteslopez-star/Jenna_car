// All requests use fixtures. No real accounts, mail or MySQL writes.
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) })
const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } })
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5180'
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
let serverUser
let release
const registration = new Promise((resolve) => { release = resolve })
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC1sAAAAASUVORK5CYII=', 'base64')
await page.route('**/api/**', async (route) => {
  const request = route.request()
  const path = new URL(request.url()).pathname
  let body = { data: [] }
  if (path === '/api/auth/register') {
    const data = request.postDataJSON()
    serverUser = { id: 1, nombre: data.nombre, apellido: data.apellido, email: data.email, telefono: data.telefono, rol: 'usuario' }
    await registration
    body = { user: serverUser, token: 'fake-test-token' }
  }
  if (path === '/api/auth/me') body = { user: serverUser }
  if (path === '/api/usuarios/perfil') {
    assert.match(request.postData(), /Ana actualizada/)
    serverUser = { ...serverUser, nombre: 'Ana actualizada', telefono: '3009999999' }
    body = { user: serverUser }
  }
  if (path === '/api/usuarios/perfil/foto') {
    serverUser = { ...serverUser, foto_perfil: '/uploads/profile-photos/test.png' }
    body = { user: serverUser }
  }
  await route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) })
})
await page.route('**/uploads/profile-photos/test.png', (route) => route.fulfill({ contentType: 'image/png', body: png }))
try {
  await page.goto(`${origin}/register?redirect=/profile`)
  await page.locator('[name="nombre"]').fill('Ana')
  await page.locator('[name="apellido"]').fill('García')
  await page.locator('[name="telefono"]').fill('3001234567')
  await page.locator('[name="email"]').fill('qa@example.invalid')
  await page.locator('[name="password"]').fill('Prueba123456')
  await page.locator('[name="confirmation"]').fill('Prueba123456')
  await page.getByRole('button', { name: 'CREAR CUENTA' }).click()
  await page.getByRole('status', { name: 'Creando tu cuenta' }).waitFor()
  assert.equal(await page.locator('.wheel-and-hamster').count(), 1)
  release()
  await page.waitForURL('**/profile')
  await page.getByRole('heading', { name: 'Ana García' }).waitFor()
  assert.equal(await page.getByRole('navigation', { name: 'Mi cuenta' }).count(), 0)
  assert.equal(await page.locator('.profile-cover, .profile-tabs').count(), 0)
  assert.equal(await page.getByRole('link', { name: 'Agendar cita', exact: true }).count(), 1)
  await page.getByRole('button', { name: 'Editar perfil' }).click()
  await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Ana actualizada')
  await page.getByRole('textbox', { name: 'Teléfono', exact: true }).fill('3009999999')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await page.getByText('Perfil actualizado correctamente.', { exact: true }).waitFor()
  await page.getByLabel('Cambiar foto de perfil', { exact: true }).setInputFiles({ name: 'profile.png', mimeType: 'image/png', buffer: png })
  await page.getByText('Foto actualizada correctamente.', { exact: true }).waitFor()
  await page.reload()
  await page.getByRole('heading', { name: 'Ana actualizada García' }).waitFor()
  assert.equal(await page.locator('.profile-avatar').getAttribute('src').then((src) => src.endsWith('/uploads/profile-photos/test.png')), true)
  await page.getByRole('button', { name: 'Editar perfil' }).click()
  assert.equal(await page.getByRole('textbox', { name: 'Teléfono', exact: true }).inputValue(), '3009999999')
  assert.deepEqual(errors, [])
  console.log('PASS: minimal profile, registration loading/redirect, profile/photo updates and reload persistence.')
} finally { await browser.close() }
