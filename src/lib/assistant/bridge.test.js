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

test('request deja un pedido pendiente que se toma una sola vez y avisa a onRequest', () => {
  const b = createBridge()
  const seen = []
  const off = b.onRequest(() => seen.push('aviso'))
  assert.equal(b.takeRequest(), null)
  const item = { request: { action: 'shortcut', message: 'm' }, label: 'Explicar', selection: null }
  b.request(item)
  assert.deepEqual(seen, ['aviso'])
  assert.equal(b.takeRequest(), item)
  assert.equal(b.takeRequest(), null)
  off()
  b.request(item)
  assert.equal(seen.length, 1)
})

test('un pedido nuevo reemplaza al pendiente y un listener roto no corta a los demás', () => {
  const b = createBridge()
  let n = 0
  b.onRequest(() => { throw new Error('x') })
  b.onRequest(() => { n++ })
  b.request({ request: { action: 'shortcut', message: 'a' }, label: 'a', selection: null })
  b.request({ request: { action: 'shortcut', message: 'b' }, label: 'b', selection: null })
  assert.equal(n, 2)
  assert.equal(b.takeRequest().label, 'b')
})

test('clearRequest descarta el pedido pendiente sin avisar (la carpeta se desmontó)', () => {
  const b = createBridge()
  let n = 0
  b.onRequest(() => { n++ })
  b.request({ request: { action: 'shortcut', message: 'a' }, label: 'a', selection: null })
  b.clearRequest()
  assert.equal(n, 1)
  assert.equal(b.takeRequest(), null)
})
