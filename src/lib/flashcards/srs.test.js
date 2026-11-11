import { test } from 'node:test'
import assert from 'node:assert/strict'
import { REVIEW_DAYS, nextReview, isDue, dueCards, boxLabel } from './srs.js'

const now = new Date('2026-11-10T12:00:00Z')
const days = (n) => new Date(now.getTime() + n * 86400000).toISOString()

test('REVIEW_DAYS: 0, 1, 2, 4 y 8 días por caja', () => {
  assert.deepEqual(REVIEW_DAYS, [0, 1, 2, 4, 8])
})

test('acertar sube una caja y agenda según la caja nueva', () => {
  assert.deepEqual(nextReview({ box: 1 }, true, now), { box: 2, due_at: days(1), last_reviewed_at: now.toISOString() })
  assert.deepEqual(nextReview({ box: 3 }, true, now), { box: 4, due_at: days(4), last_reviewed_at: now.toISOString() })
  assert.equal(nextReview({ box: 4 }, true, now).box, 5)
})

test('acertar en la caja 5 la mantiene y agenda a 8 días', () => {
  assert.deepEqual(nextReview({ box: 5 }, true, now), { box: 5, due_at: days(8), last_reviewed_at: now.toISOString() })
})

test('fallar vuelve a la caja 1 y vence ahora', () => {
  assert.deepEqual(nextReview({ box: 4 }, false, now), { box: 1, due_at: days(0), last_reviewed_at: now.toISOString() })
  assert.deepEqual(nextReview({}, false, now), { box: 1, due_at: days(0), last_reviewed_at: now.toISOString() })
})

test('isDue compara el vencimiento con ahora', () => {
  assert.equal(isDue({ due_at: days(-1) }, now), true)
  assert.equal(isDue({ due_at: days(0) }, now), true)
  assert.equal(isDue({ due_at: days(1) }, now), false)
  assert.equal(isDue({}, now), true)
})

test('dueCards filtra las vencidas sin tocar el resto', () => {
  const cards = [
    { id: 'a', due_at: days(-2) },
    { id: 'b', due_at: days(3) },
    { id: 'c', due_at: days(0) },
  ]
  assert.deepEqual(dueCards(cards, now).map((c) => c.id), ['a', 'c'])
})

test('boxLabel devuelve la clave de traducción de la caja', () => {
  assert.equal(boxLabel(1), 'flashcards.box.1')
  assert.equal(boxLabel(3), 'flashcards.box.3')
  assert.equal(boxLabel(5), 'flashcards.box.5')
  assert.equal(boxLabel(9), 'flashcards.box.5')
  assert.equal(boxLabel(0), 'flashcards.box.1')
})
