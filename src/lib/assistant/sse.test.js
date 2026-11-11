import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSseParser } from './sse.js'

test('dos eventos en un mismo chunk', () => {
  const p = createSseParser()
  const out = p.push('data: {"type":"text","text":"a"}\n\ndata: {"type":"done"}\n\n')
  assert.deepEqual(out, [{ type: 'text', text: 'a' }, { type: 'done' }])
})

test('un evento partido en dos chunks', () => {
  const p = createSseParser()
  assert.deepEqual(p.push('data: {"type":"te'), [])
  assert.deepEqual(p.push('xt","text":"hola"}\n\n'), [{ type: 'text', text: 'hola' }])
})

test('ignora líneas de comentario', () => {
  const p = createSseParser()
  assert.deepEqual(p.push(': ping\n\ndata: {"type":"done"}\n\n'), [{ type: 'done' }])
})

test('JSON roto se ignora sin lanzar', () => {
  const p = createSseParser()
  assert.deepEqual(p.push('data: {roto\n\ndata: {"type":"done"}\n\n'), [{ type: 'done' }])
})

test('flush procesa lo que quedó sin salto final', () => {
  const p = createSseParser()
  p.push('data: {"type":"done"}')
  assert.deepEqual(p.flush(), [{ type: 'done' }])
})

test('tolera CRLF', () => {
  const p = createSseParser()
  assert.deepEqual(p.push('data: {"type":"done"}\r\n\r\n'), [{ type: 'done' }])
})

test('data: multilínea se une con salto', () => {
  const p = createSseParser()
  assert.deepEqual(p.push('data: {"type":\ndata: "done"}\n\n'), [{ type: 'done' }])
})

test('[DONE] se descarta', () => {
  const p = createSseParser()
  assert.deepEqual(p.push('data: [DONE]\n\n'), [])
})

test('data: sin espacio posterior', () => {
  const p = createSseParser()
  assert.deepEqual(p.push('data:{"type":"done"}\n\n'), [{ type: 'done' }])
})

test('tope de buffer: basura sin salto de línea no crece sin límite y se recupera', () => {
  const p = createSseParser()
  assert.deepEqual(p.push('x'.repeat(1_000_001)), [])
  assert.deepEqual(p.push('data: {"type":"done"}\n\n'), [{ type: 'done' }])
})
