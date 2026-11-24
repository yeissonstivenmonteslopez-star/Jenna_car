import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/features/auth/safeRedirect.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { safeRedirect } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
globalThis.window = { location: { origin: 'https://jenna.example' } }

test('conserva destinos internos y el identificador de la notificaciÃ³n', () => {
  assert.equal(safeRedirect('/mis-citas?cita=7', '/'), '/mis-citas?cita=7')
  assert.equal(safeRedirect('/admin/orders', '/'), '/admin/orders')
})

test('usa el panel del rol para destinos externos o desconocidos', () => {
  for (const value of [null, '//other.example', 'https://other.example', '/desconocido']) {
    assert.equal(safeRedirect(value, '/mechanic'), '/mechanic')
  }
})
