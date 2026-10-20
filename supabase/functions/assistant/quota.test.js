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
  assert.equal(decideAccess({ plan: 'free', action: 'chat', scope: { type: 'subject', id: 's' }, counts: { chat: 0 } }).allowed, true)
})

test('tope del chat: en el máximo corta, uno antes permite', () => {
  const scope = { type: 'subject', id: 's' }
  const max = LIMITS.free.chat.max
  const r = decideAccess({ plan: 'free', action: 'chat', scope, counts: { chat: max } })
  assert.equal(r.allowed, false)
  assert.equal(r.code, 'quota')
  assert.equal(decideAccess({ plan: 'free', action: 'chat', scope, counts: { chat: max - 1 } }).allowed, true)
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

test('requiredCounts: quiz_grade cuenta en su balde grade (diario); premium summary sin tope', () => {
  const r = requiredCounts({ plan: 'free', action: 'quiz_grade', external: false, now: NOW })
  assert.deepEqual(r.map((c) => [c.key, c.actions, c.since]), [['grade', ['quiz_grade'], '2026-10-19T00:00:00.000Z']])
  assert.deepEqual(requiredCounts({ plan: 'premium', action: 'summary', external: false, now: NOW }), [])
})

const SUBJ = { type: 'subject', id: 's' }
const acc = (o) => decideAccess({ scope: SUBJ, counts: {}, ...o })

test('falla cerrado: falta el conteo del balde', () => {
  for (const counts of [{}, { chat: undefined }, { chat: null }, { chat: NaN }, { chat: '3' }]) {
    const r = acc({ plan: 'free', action: 'chat', counts })
    assert.equal(r.allowed, false)
    assert.equal(r.code, 'quota')
    assert.equal(r.message, 'No pudimos verificar tu uso. Probá de nuevo.')
  }
})

test('falla cerrado: external:true sin conteo external', () => {
  const r = acc({ plan: 'free', action: 'chat', external: true, counts: { chat: 0 } })
  assert.equal(r.code, 'quota')
  assert.equal(r.message, 'No pudimos verificar tu uso. Probá de nuevo.')
})

test('external: max-1 permite, max deniega (free y premium)', () => {
  for (const plan of ['free', 'premium']) {
    const max = LIMITS[plan].external.max
    const base = { plan, action: 'chat', external: true }
    assert.equal(acc({ ...base, counts: { chat: 0, external: max - 1 } }).allowed, true)
    const r = acc({ ...base, counts: { chat: 0, external: max } })
    assert.equal(r.allowed, false)
    assert.equal(r.code, 'quota')
  }
})

test('external no pedido: no exige conteo external', () => {
  assert.equal(acc({ plan: 'free', action: 'chat', counts: { chat: 0 } }).allowed, true)
})

test('free: borde de quiz y summary', () => {
  for (const [action, key] of [['quiz', 'quiz'], ['summary', 'summary']]) {
    const max = LIMITS.free[key].max
    assert.equal(acc({ plan: 'free', action, counts: { [key]: max - 1 } }).allowed, true)
    assert.equal(acc({ plan: 'free', action, counts: { [key]: max } }).code, 'quota')
  }
})

test('free: gaps entra en el tope extras (Ruling P); study_plan y connections siguen bloqueados por feature', () => {
  const max = LIMITS.free.extras.max
  assert.ok(max > 0, 'free tiene algo de extras')
  assert.equal(LIMITS.free.extras.period, 'month')
  assert.equal(acc({ plan: 'free', action: 'gaps', counts: { extras: max - 1 } }).allowed, true)
  const capped = acc({ plan: 'free', action: 'gaps', counts: { extras: max } })
  assert.equal(capped.allowed, false)
  assert.equal(capped.code, 'quota')
  assert.match(capped.message, /tope/i)
  for (const action of ['study_plan', 'connections']) {
    const r = acc({ plan: 'free', action, counts: { extras: 0 } })
    assert.equal(r.allowed, false)
    assert.equal(r.code, 'feature')
  }
})

test('premium sin tope permite sin conteos; quiz_grade exige su conteo y respeta el tope', () => {
  for (const action of ['summary', 'quiz', 'study_plan', 'gaps', 'connections', 'weak_review']) {
    assert.equal(acc({ plan: 'premium', action }).allowed, true)
  }
  assert.equal(acc({ plan: 'free', action: 'quiz_grade' }).allowed, false, 'sin conteo → falla cerrado')
  assert.equal(acc({ plan: 'free', action: 'quiz_grade', counts: { grade: 9 } }).allowed, true)
  const capped = acc({ plan: 'free', action: 'quiz_grade', counts: { grade: 10 } })
  assert.equal(capped.allowed, false)
  assert.equal(capped.code, 'quota')
  assert.match(capped.message, /correc/i)
  assert.equal(acc({ plan: 'premium', action: 'quiz_grade', counts: { grade: 99 } }).allowed, true)
  assert.equal(acc({ plan: 'premium', action: 'quiz_grade', counts: { grade: 100 } }).allowed, false)
})

test('periodStart: bordes y período inválido', () => {
  assert.equal(periodStart('month', new Date('2026-10-31T23:59:59Z')).toISOString(), '2026-10-01T00:00:00.000Z')
  assert.equal(periodStart('day', new Date('2026-12-31T23:59:59Z')).toISOString(), '2026-12-31T00:00:00.000Z')
  assert.equal(periodStart('day', new Date('2026-10-19T23:30:00-03:00')).toISOString(), '2026-10-20T00:00:00.000Z')
  assert.throws(() => periodStart('week', NOW))
})
