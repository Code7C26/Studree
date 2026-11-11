import { test } from 'node:test'
import assert from 'node:assert/strict'
import { withCareerColor, pickSubjectColor } from './careerColor.js'

test('withCareerColor pinta solo las materias de esa carrera', () => {
  const rows = [
    { id: 's1', career_id: 'c1', color: '#22c55e' },
    { id: 's2', career_id: 'c2', color: '#22c55e' },
    { id: 's3', career_id: 'c1', color: '#3b82f6' },
  ]
  const out = withCareerColor(rows, 'c1', '#ec4899')
  assert.deepEqual(
    out.map((row) => row.color),
    ['#ec4899', '#22c55e', '#ec4899'],
  )
  assert.equal(rows[0].color, '#22c55e', 'no muta las filas originales')
})

test('withCareerColor tolera una cache vacía o corrupta', () => {
  assert.deepEqual(withCareerColor([], 'c1', '#ec4899'), [])
  assert.deepEqual(withCareerColor(null, 'c1', '#ec4899'), [])
})

test('pickSubjectColor: el pedido explícito, si no el de la carrera, si no el verde', () => {
  assert.equal(pickSubjectColor('#8b5cf6', '#ec4899'), '#8b5cf6')
  assert.equal(pickSubjectColor(undefined, '#ec4899'), '#ec4899')
  assert.equal(pickSubjectColor(undefined, null), '#22c55e')
})
