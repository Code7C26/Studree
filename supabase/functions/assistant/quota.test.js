import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LIMITS } from './config.js'
import { periodStart, planOf, requiredCounts, decideAccess } from './quota.js'

const NOW = new Date('2026-10-19T15:30:00Z')

test('periodStart día y mes en UTC', () => {
  assert.equal(periodStart('day', NOW).toISOString(), '2026-10-19T00:00:00.000Z')
  assert.equal(periodStart('month', NOW).toISOString(), '2026-10-01T00:00:00.000Z')
})

test('planOf: cualquier cosa que no sea premium es free', () => {
  assert.equal(planOf(null), 'free')
  assert.equal(planOf({ plan: 'x' }), 'free')
  assert.equal(planOf({}), 'free')
  assert.equal(planOf({ plan: 'premium' }), 'premium')
})

test('free: funciones premium bloqueadas por feature', () => {
  const r = decideAccess({ plan: 'free', action: 'weak_review', scope: { type: 'subject', id: 's' }, counts: {} })
  assert.equal(r.allowed, false)
  assert.equal(r.code, 'feature')
  assert.ok(r.message.length > 0)
  for (const scope of [{ type: 'all' }, { type: 'career', id: 'c' }]) {
    const x = decideAccess({ plan: 'free', action: 'chat', scope, counts: {} })
    assert.equal(x.allowed, false)
    assert.equal(x.code, 'feature')
  }
  assert.equal(decideAccess({ plan: 'free', action: 'chat', scope: { type: 'subject', id: 's' }, counts: {} }).allowed, true)
})

test('tope del chat: en el máximo corta, uno antes permite', () => {
  const scope = { type: 'subject', id: 's' }
  const max = LIMITS.free.chat.max
  const r = decideAccess({ plan: 'free', action: 'chat', scope, counts: { chat: max } })
  assert.equal(r.allowed, false)
  assert.equal(r.code, 'quota')
  assert.equal(decideAccess({ plan: 'free', action: 'chat', scope, counts: { chat: max - 1 } }).allowed, true)
})

test('tope externo se chequea si viene en counts', () => {
  const scope = { type: 'subject', id: 's' }
  const r = decideAccess({ plan: 'free', action: 'chat', scope, counts: { chat: 0, external: LIMITS.free.external.max } })
  assert.equal(r.code, 'quota')
})

test('premium sin tope en summary', () => {
  const scope = { type: 'all' }
  assert.equal(decideAccess({ plan: 'premium', action: 'summary', scope, counts: { summary: 99999 } }).allowed, true)
})

test('requiredCounts: shortcut comparte el balde chat', () => {
  const r = requiredCounts({ plan: 'free', action: 'shortcut', external: false, now: NOW })
  assert.equal(r.length, 1)
  assert.equal(r[0].key, 'chat')
  assert.deepEqual(r[0].actions, ['chat', 'shortcut'])
  assert.equal(r[0].external, false)
  assert.equal(r[0].since, '2026-10-19T00:00:00.000Z')
})

test('requiredCounts: external suma una clave extra', () => {
  const r = requiredCounts({ plan: 'free', action: 'chat', external: true, now: NOW })
  assert.deepEqual(r.map((c) => c.key), ['chat', 'external'])
  assert.equal(r[1].external, true)
})

test('requiredCounts: quiz_grade no cuenta; premium summary sin tope', () => {
  assert.deepEqual(requiredCounts({ plan: 'free', action: 'quiz_grade', external: false, now: NOW }), [])
  assert.deepEqual(requiredCounts({ plan: 'premium', action: 'summary', external: false, now: NOW }), [])
})
