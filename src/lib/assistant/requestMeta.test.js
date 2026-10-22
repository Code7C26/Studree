import { test } from 'node:test'
import assert from 'node:assert/strict'
import { requestMeta } from './requestMeta.js'

const ctx = { subject: { id: 's1', name: 'Biología' }, career: { id: 'c1' } }

test('requestMeta: hoja y materia usan la materia del contexto y su carrera', () => {
  assert.deepEqual(requestMeta({ type: 'sheet', id: 'h1' }, ctx), { scope: { type: 'sheet', id: 'h1' }, subjectId: 's1', careerId: 'c1', subjectName: 'Biología' })
  assert.deepEqual(requestMeta({ type: 'subject', id: 's9' }, ctx), { scope: { type: 'subject', id: 's9' }, subjectId: 's1', careerId: 'c1', subjectName: 'Biología' })
})

test('requestMeta: materia sin contexto cae al id del alcance', () => {
  const m = requestMeta({ type: 'subject', id: 's9' }, null)
  assert.equal(m.subjectId, 's9')
  assert.equal(m.careerId, null)
  assert.equal(m.subjectName, null)
})

test('requestMeta: carrera usa su id y no la materia del contexto', () => {
  assert.deepEqual(requestMeta({ type: 'career', id: 'c2' }, ctx), { scope: { type: 'career', id: 'c2' }, subjectId: null, careerId: 'c2', subjectName: null })
})

test('requestMeta: todas mis materias no depende de ninguna carrera ni materia', () => {
  assert.deepEqual(requestMeta({ type: 'all' }, ctx), { scope: { type: 'all' }, subjectId: null, careerId: null, subjectName: null })
})
