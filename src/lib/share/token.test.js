import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidToken, normalizeToken, newToken, TOKEN_RE } from './token.js'

test('un token válido son 32 hex en minúsculas', () => {
  assert.equal(TOKEN_RE.test('a'.repeat(32)), true)
  assert.equal(isValidToken('0123456789abcdef0123456789abcdef'), true)
  assert.ok(isValidToken(newToken()))
})

test('normalizeToken recorta y pasa a minúsculas', () => {
  assert.equal(normalizeToken('  ABCDEF0123456789ABCDEF0123456789  '), 'abcdef0123456789abcdef0123456789')
  assert.equal(normalizeToken(undefined), '')
  assert.equal(isValidToken('ABCDEF0123456789ABCDEF0123456789'), true)
})

test('rechaza largos y caracteres que no son hex', () => {
  assert.equal(isValidToken('a'.repeat(31)), false)
  assert.equal(isValidToken('a'.repeat(33)), false)
  assert.equal(isValidToken('g'.repeat(32)), false)
  assert.equal(isValidToken(''), false)
})

test('newToken() da 32 hex distintos', () => {
  const a = newToken()
  const b = newToken()
  assert.equal(a.length, 32)
  assert.ok(isValidToken(a))
  assert.notEqual(a, b)
})
