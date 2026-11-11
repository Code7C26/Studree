import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatPrice } from './price.js'

/** Intl separa símbolo y número con un espacio duro: se normaliza para comparar. */
const plain = (text) => text.replace(/\s/g, ' ')

test('formatPrice en castellano: pesos con punto de miles y sin centavos', () => {
  assert.equal(plain(formatPrice(4999, 'ARS', 'es')), '$ 4.999')
  assert.equal(plain(formatPrice(0, 'ARS', 'es')), '$ 0')
})

test('formatPrice en inglés: aclara la moneda', () => {
  assert.equal(plain(formatPrice(4999, 'ARS', 'en')), 'ARS 4,999')
})
