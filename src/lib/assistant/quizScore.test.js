import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gradeClosed, summarize, openAnswers, mergeResults } from './quizScore.js'

const questions = [
  { id: 'q1', type: 'mcq', prompt: '¿2+2?', options: ['3', '4', '5'], answer: 1, explanation: 'Suma', topic: 'Suma' },
  { id: 'q2', type: 'tf', prompt: 'El cielo es verde', answer: false, explanation: 'Es azul', topic: 'Cielo' },
  { id: 'q3', type: 'open', prompt: 'Definí derivada', answer: 'Límite del cociente incremental', explanation: 'Def.', topic: 'Derivadas' },
]

test('gradeClosed: mcq correcto, tf correcto y abierta en null', () => {
  assert.deepEqual(gradeClosed(questions, { q1: 1, q2: false, q3: 'algo' }), [
    { id: 'q1', correct: true },
    { id: 'q2', correct: true },
    { id: 'q3', correct: null },
  ])
})

test('gradeClosed: mcq y tf incorrectos o sin responder son false', () => {
  assert.deepEqual(gradeClosed(questions, { q1: 0, q2: true }), [
    { id: 'q1', correct: false },
    { id: 'q2', correct: false },
    { id: 'q3', correct: null },
  ])
  assert.deepEqual(gradeClosed(questions, {}).map((r) => r.correct), [false, false, null])
})

test('gradeClosed: no confunde tipos (el índice como texto no vale)', () => {
  assert.equal(gradeClosed([questions[0]], { q1: '1' })[0].correct, false)
  assert.equal(gradeClosed([questions[1]], { q2: 'false' })[0].correct, false)
})

test('gradeClosed: tolera entradas raras', () => {
  assert.deepEqual(gradeClosed(null, null), [])
  assert.deepEqual(gradeClosed([null, { id: 'x', type: 'zzz' }], {}), [])
})

test('summarize cuenta bien, también vacío, y correct nunca supera total', () => {
  assert.deepEqual(summarize([]), { total: 0, correct: 0 })
  assert.deepEqual(summarize(undefined), { total: 0, correct: 0 })
  assert.deepEqual(
    summarize([{ id: 'a', correct: true }, { id: 'b', correct: false }, { id: 'c', correct: true }]),
    { total: 3, correct: 2 },
  )
  // Las abiertas sin corregir (null) no cuentan.
  assert.deepEqual(summarize([{ id: 'a', correct: true }, { id: 'b', correct: null }]), { total: 1, correct: 1 })
})

test('openAnswers arma el pedido de corrección solo con abiertas respondidas', () => {
  assert.deepEqual(openAnswers(questions, { q3: '  el límite  ' }), [
    { id: 'q3', question: 'Definí derivada', expected: 'Límite del cociente incremental', given: 'el límite' },
  ])
  assert.deepEqual(openAnswers(questions, { q3: '   ' }), [])
  assert.equal(openAnswers(questions, { q3: 'x'.repeat(5000) })[0].given.length, 4000)
})

test('mergeResults: suma las notas del servidor; abierta vacía es error y sin nota queda null', () => {
  const given = { q1: 1, q2: true, q3: 'algo' }
  const merged = mergeResults(questions, given, gradeClosed(questions, given), [{ id: 'q3', correct: true, feedback: 'Bien' }])
  assert.deepEqual(
    merged.map((r) => [r.id, r.correct, r.feedback ?? null]),
    [['q1', true, null], ['q2', false, null], ['q3', true, 'Bien']],
  )

  const empty = mergeResults(questions, { q1: 1 }, gradeClosed(questions, { q1: 1 }), [])
  assert.equal(empty[2].correct, false)

  const noGrade = mergeResults(questions, { q3: 'algo' }, gradeClosed(questions, { q3: 'algo' }), null)
  assert.equal(noGrade[2].correct, null)
  // Una nota con correct no booleano se ignora.
  const bad = mergeResults(questions, { q3: 'algo' }, gradeClosed(questions, { q3: 'algo' }), [{ id: 'q3', correct: 'si' }])
  assert.equal(bad[2].correct, null)
})
