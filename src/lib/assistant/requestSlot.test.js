import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequestSlot } from './requestSlot.js'

test('un solo pedido a la vez, con dueño', () => {
  const slot = createRequestSlot()
  assert.equal(slot.running(), false)
  assert.equal(slot.owner(), null)
  const c = slot.claim('chat')
  assert.equal(slot.running(), true)
  assert.equal(slot.owner(), 'chat')
  slot.release(c)
  assert.equal(slot.running(), false)
  assert.equal(slot.owner(), null)
})

test('close de la tarjeta corta su pedido y lo suelta enseguida', () => {
  const slot = createRequestSlot()
  const c = slot.claim('inline')
  assert.equal(slot.abort('inline', { free: true }), true)
  assert.equal(c.signal.aborted, true)
  assert.equal(slot.running(), false) // el chat puede pedir ya
})

test('cortar la tarjeta no toca un pedido del chat', () => {
  const slot = createRequestSlot()
  const c = slot.claim('chat')
  assert.equal(slot.abort('inline', { free: true }), false)
  assert.equal(c.signal.aborted, false)
  assert.equal(slot.owner(), 'chat')
})

test('la limpieza del pedido reemplazado no suelta al nuevo', () => {
  const slot = createRequestSlot()
  const old = slot.claim('inline')
  slot.abort('inline', { free: true })
  const next = slot.claim('inline')
  slot.release(old) // termina tarde el pedido cortado
  assert.equal(slot.running(), true)
  assert.equal(next.signal.aborted, false)
  slot.release(next)
  assert.equal(slot.running(), false)
})

test('Detener del chat corta pero el pedido sigue ocupando hasta que termina', () => {
  const slot = createRequestSlot()
  const c = slot.claim('chat')
  assert.equal(slot.abort('chat'), true)
  assert.equal(c.signal.aborted, true)
  assert.equal(slot.running(), true) // lo suelta `release` al cerrar el stream
  slot.release(c)
  assert.equal(slot.running(), false)
})

test('abort sin dueño corta cualquiera (al desmontar el motor)', () => {
  const slot = createRequestSlot()
  const c = slot.claim('inline')
  assert.equal(slot.abort(), true)
  assert.equal(c.signal.aborted, true)
  assert.equal(slot.abort('chat'), false)
  assert.equal(createRequestSlot().abort(), false)
})
