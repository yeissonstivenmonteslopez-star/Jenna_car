import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/features/recibos/services/testCards.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { TEST_CARDS, detectBrand, formatCard, luhn, validTestCard } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('las tres tarjetas de demostración son válidas y tienen su marca', () => {
  for (const [brand, number] of Object.entries(TEST_CARDS)) {
    assert.equal(detectBrand(number), brand)
    assert.equal(luhn(number), true)
    assert.equal(validTestCard(formatCard(number)), true)
  }
})

test('rechaza una tarjeta que pasa Luhn pero no pertenece al simulador', () => {
  assert.equal(luhn('4111111111111111'), true)
  assert.equal(validTestCard('4111111111111111'), false)
})

test('rechaza entradas vacías, caracteres y números alterados', () => {
  for (const number of ['', 'abc', '4242424242424241', '1234', '42424242424242424242']) {
    assert.equal(validTestCard(number), false)
  }
})

test('formatea las tarjetas de 16 y 15 dígitos sin aceptar dígitos adicionales', () => {
  assert.equal(formatCard(TEST_CARDS.visa + '999'), '4242 4242 4242 4242')
  assert.equal(formatCard(TEST_CARDS.amex + '999'), '3782 822463 10005')
})
