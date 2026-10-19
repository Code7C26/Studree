import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createBridge } from './bridge.js'

const ctx = { subject: { id: 's', name: 'Bio' }, career: null, sheetId: null, getSelection: () => null, apply: () => ({ ok: true }) }

test('get devuelve lo último seteado y set(null) limpia', () => {
  const b = createBridge()
  assert.equal(b.get(), null)
  b.set(ctx)
  assert.equal(b.get(), ctx)
  b.set(null)
  assert.equal(b.get(), null)
})

test('subscribe notifica en cada set y deja de hacerlo al desuscribir', () => {
  const b = createBridge()
  const seen = []
  const off = b.subscribe((c) => seen.push(c))
  b.set(ctx)
  b.set(null)
  off()
  b.set(ctx)
  assert.deepEqual(seen, [ctx, null])
})

test('un suscriptor que tira error no corta a los demás', () => {
  const b = createBridge()
  let n = 0
  b.subscribe(() => { throw new Error('x') })
  b.subscribe(() => { n++ })
  b.set(ctx)
  assert.equal(n, 1)
})
