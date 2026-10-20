import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planWeakTopicUpdates, attachSubjects } from './weakTopics.js'

const S1 = 'sub-1'
const S2 = 'sub-2'

test('un error nuevo → upsert con misses 1', () => {
  const plan = planWeakTopicUpdates({
    existing: [],
    results: [{ subject_id: S1, sheet_id: 'sh1', topic: 'Derivadas', correct: false }],
    isReview: false,
  })
  assert.deepEqual(plan, { upserts: [{ subject_id: S1, sheet_id: 'sh1', topic: 'Derivadas', misses: 1 }], deletes: [] })
})

test('un error repetido → misses + 1 y conserva el texto guardado del tema', () => {
  const plan = planWeakTopicUpdates({
    existing: [{ id: 'w1', subject_id: S1, topic: 'Derivadas', misses: 2, sheet_id: 'sh0' }],
    results: [{ subject_id: S1, topic: '  derivadas ', correct: false }],
    isReview: false,
  })
  assert.deepEqual(plan.upserts, [{ subject_id: S1, sheet_id: 'sh0', topic: 'Derivadas', misses: 3 }])
  assert.deepEqual(plan.deletes, [])
})

test('acierto en un repaso de un tema existente → deletes', () => {
  const plan = planWeakTopicUpdates({
    existing: [{ id: 'w1', subject_id: S1, topic: 'Derivadas', misses: 2 }],
    results: [{ subject_id: S1, topic: 'Derivadas', correct: true }],
    isReview: true,
  })
  assert.deepEqual(plan, { upserts: [], deletes: ['w1'] })
})

test('acierto en un examen normal → no toca nada', () => {
  const plan = planWeakTopicUpdates({
    existing: [{ id: 'w1', subject_id: S1, topic: 'Derivadas', misses: 2 }],
    results: [{ subject_id: S1, topic: 'Derivadas', correct: true }],
    isReview: false,
  })
  assert.deepEqual(plan, { upserts: [], deletes: [] })
})

test('dos errores del mismo tema en una prueba suman una sola vez', () => {
  const plan = planWeakTopicUpdates({
    existing: [{ id: 'w1', subject_id: S1, topic: 'Derivadas', misses: 1 }],
    results: [
      { subject_id: S1, topic: 'Derivadas', correct: false },
      { subject_id: S1, sheet_id: 'sh2', topic: 'Derivadas', correct: false },
    ],
    isReview: false,
  })
  assert.deepEqual(plan.upserts, [{ subject_id: S1, sheet_id: 'sh2', topic: 'Derivadas', misses: 2 }])
})

test('en un repaso, acierto y error del mismo tema: gana el error (no se borra)', () => {
  const plan = planWeakTopicUpdates({
    existing: [{ id: 'w1', subject_id: S1, topic: 'Derivadas', misses: 1 }],
    results: [
      { subject_id: S1, topic: 'Derivadas', correct: true },
      { subject_id: S1, topic: 'Derivadas', correct: false },
    ],
    isReview: true,
  })
  assert.deepEqual(plan, { upserts: [{ subject_id: S1, sheet_id: null, topic: 'Derivadas', misses: 2 }], deletes: [] })
})

test('el mismo tema en materias distintas son temas distintos', () => {
  const plan = planWeakTopicUpdates({
    existing: [{ id: 'w1', subject_id: S1, topic: 'Repaso', misses: 4 }],
    results: [{ subject_id: S2, topic: 'Repaso', correct: false }],
    isReview: false,
  })
  assert.deepEqual(plan.upserts, [{ subject_id: S2, sheet_id: null, topic: 'Repaso', misses: 1 }])
})

test('descarta resultados sin materia, sin tema o sin corregir, y recorta el tema a 200', () => {
  const plan = planWeakTopicUpdates({
    existing: [],
    results: [
      { subject_id: '', topic: 'A', correct: false },
      { subject_id: S1, topic: '   ', correct: false },
      { subject_id: S1, topic: 'B', correct: null },
      { subject_id: S1, topic: 'x'.repeat(250), correct: false },
    ],
    isReview: true,
  })
  assert.equal(plan.upserts.length, 1)
  assert.equal(plan.upserts[0].topic.length, 200)
  assert.deepEqual(plan.deletes, [])
})

test('tolera entradas vacías', () => {
  assert.deepEqual(planWeakTopicUpdates({}), { upserts: [], deletes: [] })
})

const sheets = {
  sh1: { subject_id: S1, created_at: '2026-10-01T10:00:00Z' },
  sh2: { subject_id: S2, created_at: '2026-10-02T10:00:00Z' },
}
const subjects = { [S1]: { career_id: 'car1' }, [S2]: { career_id: 'car2' } }
const qs = [
  { id: 'q1', topic: 'A', sheetId: 'sh1' },
  { id: 'q2', topic: 'B' },
  { id: 'q3', topic: 'C', sheetId: 'sh2' },
  { id: 'q4', topic: 'D', sheetId: 'borrada' },
]

test('attachSubjects con alcance materia: hoja de la materia o sin hoja resuelta → la materia; ajena → se salta', () => {
  const out = attachSubjects(qs, { scope: { type: 'subject', id: S1 }, scopeSubjectId: S1, sheets, subjects })
  assert.deepEqual(out, {
    q1: { subject_id: S1, sheet_id: 'sh1' },
    q2: { subject_id: S1, sheet_id: null },
    q4: { subject_id: S1, sheet_id: null },
  })
})

test('attachSubjects con alcance carrera: solo hojas resueltas de materias de esa carrera', () => {
  const out = attachSubjects(qs, { scope: { type: 'career', id: 'car1' }, scopeSubjectId: null, sheets, subjects })
  assert.deepEqual(out, { q1: { subject_id: S1, sheet_id: 'sh1' } })
})

test('attachSubjects con alcance todas: cualquier materia viva, sin adivinar las que no tienen hoja', () => {
  const out = attachSubjects(qs, { scope: { type: 'all' }, scopeSubjectId: null, sheets, subjects })
  assert.deepEqual(out, { q1: { subject_id: S1, sheet_id: 'sh1' }, q3: { subject_id: S2, sheet_id: 'sh2' } })
})

test('attachSubjects: la materia del alcance en la papelera no recibe nada', () => {
  const out = attachSubjects(qs, { scope: { type: 'subject', id: S1 }, scopeSubjectId: S1, sheets, subjects: { [S2]: subjects[S2] } })
  assert.deepEqual(out, {})
})

test('attachSubjects: una hoja de otra materia viva no pasa con alcance hoja', () => {
  const out = attachSubjects([{ id: 'q1', topic: 'A', sheetId: 'sh2' }], {
    scope: { type: 'sheet', id: 'sh1' }, scopeSubjectId: S1, sheets, subjects,
  })
  assert.deepEqual(out, {})
})
