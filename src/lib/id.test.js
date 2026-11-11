import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateId } from './id.js'

test('generateId devuelve un uuid v4 distinto cada vez', () => {
  const a = generateId()
  const b = generateId()
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.notEqual(a, b)
})
