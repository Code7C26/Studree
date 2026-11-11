import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
createSummarySession, finishSummarySave, canRetrySummarySave, startSummaryRetry, summaryRowFor,
} from './summarySession.js'

const payload = {
title: 'Resumen · Biología',
sections: [{ heading: 'Célula', body: 'Unidad básica.' }],
keyConcepts: [],
sheets: [{ sheetId: 'h1', subjectId: 's1', date: '2026-10-17' }],
sheetCount: 1,
totalSheets: 1,
external: false,
}
const meta = { scope: { type: 'subject', id: 's1' }, subjectId: 's1', careerId: 'c1', subjectName: 'Biología' }
const NOW = '2026-10-22T12:00:00.000Z'

const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]))

test('arranca en saving con el documento sin id', () => {
  const s = createSummarySession(3, payload, meta, NOW)
  assert.deepEqual(pick(s, ['key', 'status', 'savedId', 'saveError']), { key: 3, status: 'saving', savedId: null, saveError: null })
  assert.deepEqual(pick(s.doc, ['id', 'title', 'createdAt', 'subjectId', 'careerId', 'scopeType']), {
    id: null, title: payload.title, createdAt: NOW, subjectId: 's1', careerId: 'c1', scopeType: 'subject',
  })
})

test('usa un título de respaldo si vino vacío', () => {
  assert.equal(summaryRowFor({ ...payload, title: '  ' }, meta).title, 'Resumen · Biología')
})

test('guardado ok: saved con el id en la sesión y el documento', () => {
  const s = finishSummarySave(createSummarySession(1, payload, meta, NOW), 1, { id: 'r1', error: null })
  assert.deepEqual(pick(s, ['status', 'savedId', 'saveError']), { status: 'saved', savedId: 'r1', saveError: null })
  assert.equal(s.doc.id, 'r1')
})

test('guardado fallido: error con mensaje y se puede reintentar', () => {
  const s = finishSummarySave(createSummarySession(1, payload, meta, NOW), 1, { id: null, error: 'Sin red' })
  assert.deepEqual(pick(s, ['status', 'saveError']), { status: 'error', saveError: 'Sin red' })
  assert.equal(canRetrySummarySave(s), true)
  assert.equal(startSummaryRetry(s).status, 'saving')
})

test('después de guardar no se reintenta ni se pisa el resultado (no duplica)', () => {
  const saved = finishSummarySave(createSummarySession(1, payload, meta, NOW), 1, { id: 'r1', error: null })
  assert.equal(canRetrySummarySave(saved), false)
  assert.equal(startSummaryRetry(saved), saved)
  assert.equal(finishSummarySave(saved, 1, { id: null, error: 'x' }), saved)
})

test('un resultado de otro resumen se ignora', () => {
  const s = createSummarySession(2, payload, meta, NOW)
  assert.equal(finishSummarySave(s, 1, { id: 'r1', error: null }), s)
})

test('mientras guarda no se puede reintentar', () => {
  assert.equal(canRetrySummarySave(createSummarySession(1, payload, meta, NOW)), false)
  assert.equal(canRetrySummarySave(null), false)
})

test('el título se arma en el cliente según el alcance, no con el del modelo', () => {
  assert.equal(summaryRowFor({ ...payload, title: 'Otro título' }, meta).title, 'Resumen · Biología')
  const all = { scope: { type: 'all' }, subjectId: null, careerId: null, subjectName: null }
  assert.equal(summaryRowFor(payload, all).title, 'Resumen · Todas mis materias')
})
