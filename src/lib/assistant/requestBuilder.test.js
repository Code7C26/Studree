import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildHistory, scopeOptions, resolveScopeType, buildScope, lockedActionMessage, MAX_MESSAGE,
} from './requestBuilder.js'
import { validateRequest } from '../../../supabase/functions/assistant/request.js'

const ctx = {
  subject: { id: 'sub1', name: 'Bio' },
  career: { id: 'car1', name: 'Medicina' },
  sheetId: 'sh1',
  getSelection: () => null,
  apply: () => ({ ok: true }),
}

test('buildHistory mapea roles, recorta largo y cantidad y descarta vacíos', () => {
  const messages = [
    { role: 'user', text: '' },
    ...Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `m${i}` })),
    { role: 'assistant', text: 'x'.repeat(MAX_MESSAGE + 50) },
  ]
  const h = buildHistory(messages)
  assert.equal(h.length, 20)
  assert.equal(h.at(-1).role, 'model')
  assert.equal(h.at(-1).text.length, MAX_MESSAGE)
  assert.ok(h.every((t) => t.role === 'user' || t.role === 'model'))
  assert.ok(h.every((t) => t.text !== ''))
})

test('el historial armado pasa la validación del servidor', () => {
  const history = buildHistory([
    { role: 'user', text: 'a'.repeat(9000) },
    { role: 'assistant', text: 'b'.repeat(60000) },
  ])
  const r = validateRequest({ action: 'chat', message: 'hola', history, mode: 'notes', scope: { type: 'all' } })
  assert.equal(r.ok, true)
})

test('scopeOptions: free bloquea carrera y todas; premium no', () => {
  assert.deepEqual(
    scopeOptions(ctx, 'free').map((o) => [o.value, o.locked]),
    [['sheet', false], ['subject', false], ['career', true], ['all', true]],
  )
  assert.ok(scopeOptions(ctx, 'premium').every((o) => !o.locked))
  assert.deepEqual(scopeOptions(null, 'premium').map((o) => o.value), ['all'])
})

test('resolveScopeType respeta lo elegido si se puede y si no cae en lo preferido', () => {
  const free = scopeOptions(ctx, 'free')
  assert.equal(resolveScopeType('sheet', free), 'sheet')
  assert.equal(resolveScopeType('all', free), 'subject')
  assert.equal(resolveScopeType(null, scopeOptions(null, 'premium')), 'all')
  assert.equal(resolveScopeType('subject', scopeOptions(null, 'free')), null)
})

test('buildScope arma el id según el tipo y devuelve null si falta', () => {
  assert.deepEqual(buildScope('sheet', ctx), { type: 'sheet', id: 'sh1' })
  assert.deepEqual(buildScope('subject', ctx), { type: 'subject', id: 'sub1' })
  assert.deepEqual(buildScope('career', ctx), { type: 'career', id: 'car1' })
  assert.deepEqual(buildScope('all', null), { type: 'all' })
  assert.equal(buildScope('subject', null), null)
  assert.equal(buildScope(null, ctx), null)
})

test('lockedActionMessage: free no tiene repaso ni plan; premium sí; el resto nunca se bloquea', () => {
  assert.match(lockedActionMessage('weak_review', 'free'), /Premium/)
  assert.match(lockedActionMessage('study_plan', 'free'), /Premium/)
  assert.equal(lockedActionMessage('weak_review', 'premium'), null)
  assert.equal(lockedActionMessage('summary', 'free'), null)
  assert.equal(lockedActionMessage('chat', 'free'), null)
})
