import { test } from 'node:test'
import assert from 'node:assert/strict'
import { answerText, buildQuizRecord, quizTitle } from './quizRecord.js'

test('quizTitle', () => {
  assert.equal(quizTitle({ isReview: false, scopeType: 'subject', subjectName: 'Biología' }), 'Examen · Biología')
  assert.equal(quizTitle({ isReview: true, scopeType: 'sheet', subjectName: 'Biología' }), 'Repaso de errores · Biología')
  assert.equal(quizTitle({ isReview: false, scopeType: 'career', subjectName: null }), 'Examen · Toda la carrera')
  assert.equal(quizTitle({ isReview: false, scopeType: 'all', subjectName: null }), 'Examen · Todas mis materias')
})

test('answerText', () => {
  const mcq = { type: 'mcq', options: ['a', 'b'] }
  assert.equal(answerText(mcq, 1), 'b')
  assert.equal(answerText(mcq, undefined), 'Sin responder')
  assert.equal(answerText({ type: 'tf' }, true), 'Verdadero')
  assert.equal(answerText({ type: 'tf' }, false), 'Falso')
  assert.equal(answerText({ type: 'open' }, 'texto'), 'texto')
  assert.equal(answerText({ type: 'open' }, ''), 'Sin responder')
})

test('buildQuizRecord', () => {
  const session = {
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'P1', options: ['a', 'b'], answer: 1, explanation: 'E1', topic: 'T1', sheetId: 'h1' },
      { id: 'q2', type: 'open', prompt: 'P2', answer: 'ref', explanation: 'E2', topic: 'T2' },
    ],
    given: { q1: 0 },
  }
  const outcome = {
    results: [{ id: 'q1', correct: false }, { id: 'q2', correct: true, feedback: 'bien' }],
    sheets: { h1: { subject_id: 'S1', created_at: '2026-10-17T12:00:00Z' } },
  }
  assert.deepEqual(buildQuizRecord(session, outcome), {
    version: 1,
    questions: [
      {
        id: 'q1', type: 'mcq', prompt: 'P1', options: ['a', 'b'], given: 0, answer: 1, correct: false,
        explanation: 'E1', topic: 'T1', sheetId: 'h1', subjectId: 'S1', sheetDate: '2026-10-17T12:00:00Z',
      },
      {
        id: 'q2', type: 'open', prompt: 'P2', given: null, answer: 'ref', correct: true,
        explanation: 'E2', feedback: 'bien', topic: 'T2',
      },
    ],
  })
  const vacio = buildQuizRecord(session, { results: [], sheets: {} })
  assert.equal(vacio.questions[0].correct, null)
  assert.equal('feedback' in vacio.questions[0], false)
  assert.equal('subjectId' in vacio.questions[0], false)
})

test('quizTitle y answerText en inglés', () => {
  assert.equal(quizTitle({ isReview: false, scopeType: 'subject', subjectName: 'Biology' }, 'en'), 'Exam · Biology')
  assert.equal(quizTitle({ isReview: true, scopeType: 'sheet', subjectName: 'Biology' }, 'en'), 'Mistake review · Biology')
  assert.equal(quizTitle({ isReview: false, scopeType: 'career', subjectName: null }, 'en'), 'Exam · The whole career')
  assert.equal(quizTitle({ isReview: false, scopeType: 'all', subjectName: null }, 'en'), 'Exam · All my subjects')
  assert.equal(answerText({ type: 'tf' }, true, 'en'), 'True')
  assert.equal(answerText({ type: 'tf' }, false, 'en'), 'False')
  assert.equal(answerText({ type: 'open' }, '', 'en'), 'Not answered')
})
