import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createQuizSession, startSubmit, finishSubmit, failedOutcome, blocksNewQuiz, discardQuiz, QUIZ_ACTIONS, QUIZ_OPEN_REASON,
} from './quizSession.js'

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

test('failedOutcome: un error inesperado cierra la prueba en done con el error (no queda en grading)', () => {
  const grading = startSubmit(createQuizSession(null, meta, questions), { q1: true })
  const early = failedOutcome(null, 'boom')
  assert.deepEqual(early.results, [])
  assert.deepEqual(early.score, { total: 0, correct: 0 })
  assert.deepEqual(early.sheets, {})
  assert.equal(early.gradeError, 'boom')
  assert.equal(early.saveError, null)
  assert.equal(early.savedTopics, false)
  assert.equal(finishSubmit(grading, grading.key, early).status, 'done')

  const results = [{ id: 'q1', correct: true }]
  const late = failedOutcome({ results, score: { total: 1, correct: 1 }, gradeError: null }, 'boom')
  assert.deepEqual(late.results, results)
  assert.deepEqual(late.score, { total: 1, correct: 1 })
  assert.equal(late.gradeError, null)
  assert.equal(late.saveError, 'boom', 'si ya estaba corregida, falló el guardado')
})

test('blocksNewQuiz: una prueba open o grading bloquea pedir otra; done o ninguna, no', () => {
  const open = createQuizSession(null, meta, questions)
  const grading = startSubmit(open, {})
  const done = finishSubmit(grading, grading.key, { score: { total: 1, correct: 1 } })
  assert.equal(blocksNewQuiz(open), true)
  assert.equal(blocksNewQuiz(grading), true)
  assert.equal(blocksNewQuiz(done), false)
  assert.equal(blocksNewQuiz(null), false)
  assert.deepEqual([...QUIZ_ACTIONS].sort(), ['quiz', 'weak_review'])
  assert.match(QUIZ_OPEN_REASON, /Terminá o descartá la prueba abierta/)
})

test('discardQuiz: descarta una prueba open o done; una que se está corrigiendo no', () => {
  const open = createQuizSession(null, meta, questions)
  assert.equal(discardQuiz(open), null)
  const grading = startSubmit(open, {})
  assert.equal(discardQuiz(grading), grading)
  const done = finishSubmit(grading, grading.key, { score: { total: 1, correct: 1 } })
  assert.equal(discardQuiz(done), null)
  assert.equal(discardQuiz(null), null)
})
