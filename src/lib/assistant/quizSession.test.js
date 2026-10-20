import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createQuizSession, startSubmit, finishSubmit } from './quizSession.js'

const meta = { scope: { type: 'subject', id: 's1' }, scopeSubjectId: 's1', isReview: false }
const questions = [{ id: 'q1', type: 'tf', prompt: 'p', answer: true, explanation: 'e', topic: 't' }]

test('createQuizSession arranca abierta y la key avanza', () => {
  const a = createQuizSession(null, meta, questions)
  assert.equal(a.key, 1)
  assert.equal(a.status, 'open')
  assert.equal(createQuizSession(a, meta, questions).key, 2)
})

test('startSubmit pasa a grading con las respuestas; un segundo envío se ignora', () => {
  const s = createQuizSession(null, meta, questions)
  const grading = startSubmit(s, { q1: true })
  assert.equal(grading.status, 'grading')
  assert.deepEqual(grading.given, { q1: true })
  assert.equal(startSubmit(grading, { q1: false }), null)
  const done = finishSubmit(grading, grading.key, { score: { total: 1, correct: 1 } })
  assert.equal(done.status, 'done')
  assert.equal(startSubmit(done, { q1: false }), null)
  assert.equal(startSubmit(null, {}), null)
})

test('finishSubmit ignora otra prueba y vuelve a open si no hubo resultado', () => {
  const grading = startSubmit(createQuizSession(null, meta, questions), {})
  assert.equal(finishSubmit(grading, 99, { x: 1 }), grading)
  const back = finishSubmit(grading, grading.key, null)
  assert.equal(back.status, 'open')
  assert.equal(back.given, null)
  const open = createQuizSession(null, meta, questions)
  assert.equal(finishSubmit(open, open.key, { x: 1 }), open)
})
