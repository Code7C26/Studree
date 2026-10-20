import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildHistory, scopeOptions, resolveScopeType, buildScope, lockedActionMessage, actionScope, ACTION_LABELS, MAX_MESSAGE,
  requestMode, blockReason,
} from './requestBuilder.js'
import { validateRequest } from '../../../supabase/functions/assistant/request.js'

// Ids reales: el servidor exige UUID en scope.id y selection.sheetId.
const SUB = 'a1111111-1111-4111-8111-111111111111'
const CAR = 'c1111111-1111-4111-8111-111111111111'
const SH = 'b1111111-1111-4111-8111-111111111111'

const ctx = {
  subject: { id: SUB, name: 'Bio' },
  career: { id: CAR, name: 'Medicina' },
  sheetId: SH,
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
  assert.deepEqual(buildScope('sheet', ctx), { type: 'sheet', id: SH })
  assert.deepEqual(buildScope('subject', ctx), { type: 'subject', id: SUB })
  assert.deepEqual(buildScope('career', ctx), { type: 'career', id: CAR })
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

test('chips de la segunda etapa: huecos libre, conexiones de Premium', () => {
  assert.equal(typeof ACTION_LABELS.gaps, 'string')
  assert.equal(typeof ACTION_LABELS.connections, 'string')
  assert.equal(lockedActionMessage('gaps', 'free'), null)
  assert.match(lockedActionMessage('connections', 'free'), /Premium/)
  assert.equal(lockedActionMessage('connections', 'premium'), null)
})

test('actionScope: huecos va sobre la materia; conexiones sobre la carrera o todo; el resto usa el del panel', () => {
  assert.deepEqual(actionScope('gaps', ctx), { type: 'subject', id: SUB })
  assert.equal(actionScope('gaps', null), null, 'sin materia abierta no hay alcance')
  assert.deepEqual(actionScope('connections', ctx), { type: 'career', id: CAR })
  assert.deepEqual(actionScope('connections', { ...ctx, career: null }), { type: 'all' })
  assert.deepEqual(actionScope('connections', null), { type: 'all' })
  for (const action of ['chat', 'summary', 'quiz', 'weak_review', 'study_plan']) {
    assert.equal(actionScope(action, ctx), undefined)
  }
})

test('los pedidos de huecos y conexiones pasan la validación del servidor', () => {
  for (const action of ['gaps', 'connections']) {
    const r = validateRequest({ action, message: '', history: [], mode: 'notes', scope: actionScope(action, ctx) })
    assert.equal(r.ok, true)
  }
})

test('Ruling R: quiz_grade siempre va en modo notes (nunca gasta el cupo externo)', () => {
  assert.equal(requestMode('quiz_grade', 'external'), 'notes')
  assert.equal(requestMode('quiz_grade', 'notes'), 'notes')
  assert.equal(requestMode('chat', 'external'), 'external')
  assert.equal(requestMode('quiz', 'notes'), 'notes')
  const r = validateRequest({
    action: 'quiz_grade', mode: requestMode('quiz_grade', 'external'), scope: { type: 'subject', id: SUB },
    answers: [{ id: 'q1', question: 'a', expected: 'b', given: 'c' }],
  })
  assert.equal(r.ok, true)
  assert.equal(r.value.mode, 'notes')
})

test('blockReason: ocupado, sin alcance o prueba abierta frenan el pedido (en ese orden)', () => {
  const scope = { type: 'subject', id: SUB }
  assert.equal(blockReason({ running: true, scopeValue: scope, action: 'chat', quizOpen: false }), 'busy')
  assert.equal(blockReason({ running: false, scopeValue: null, action: 'chat', quizOpen: false }), 'no_scope')
  assert.equal(blockReason({ running: false, scopeValue: scope, action: 'quiz', quizOpen: true }), 'quiz_open')
  assert.equal(blockReason({ running: false, scopeValue: scope, action: 'weak_review', quizOpen: true }), 'quiz_open')
  assert.equal(blockReason({ running: false, scopeValue: scope, action: 'chat', quizOpen: true }), null)
  assert.equal(blockReason({ running: false, scopeValue: scope, action: 'quiz_grade', quizOpen: true }), null)
  assert.equal(blockReason({ running: false, scopeValue: scope, action: 'quiz', quizOpen: false }), null)
})
