import { test } from 'node:test'
import assert from 'node:assert/strict'
import { livePrerequisites } from './livePrerequisites.js'

test('descarta correlativas hacia o desde materias que no están en la lista (papelera)', () => {
  const subjects = [{ id: 'a' }, { id: 'b' }]
  const prerequisites = [
    { id: 'p1', subject_id: 'a', requires_id: 'b' },
    { id: 'p2', subject_id: 'a', requires_id: 'borrada' },
    { id: 'p3', subject_id: 'borrada', requires_id: 'b' },
  ]
  assert.deepEqual(livePrerequisites(prerequisites, subjects).map((p) => p.id), ['p1'])
})

test('sin materias no queda ninguna', () => {
  assert.deepEqual(livePrerequisites([{ id: 'p', subject_id: 'a', requires_id: 'b' }], []), [])
})
