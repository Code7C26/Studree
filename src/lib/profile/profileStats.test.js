import { test } from 'node:test'
import assert from 'node:assert/strict'
import { profileStats, shortId, initialOf } from './profileStats.js'

const tree = [
  { id: 'c1', name: 'Medicina', color: '#3b82f6', subjects: [{ sheetCount: 4 }, { sheetCount: 2 }] },
  { id: 'c2', name: 'Inglés', color: '#ec4899', subjects: [{ sheetCount: 9 }] },
  { id: 'c3', name: 'Curso vacío', color: '#22c55e', subjects: [] },
]

test('cuenta carreras, materias y hojas', () => {
  const stats = profileStats(tree)
  assert.equal(stats.careers, 3)
  assert.equal(stats.subjects, 3)
  assert.equal(stats.sheets, 15)
})

test('ordena las carreras por hojas y calcula la proporción contra la mayor', () => {
  const { byCareer } = profileStats(tree)
  assert.deepEqual(byCareer.map((c) => c.name), ['Inglés', 'Medicina', 'Curso vacío'])
  assert.equal(byCareer[0].share, 1)
  assert.equal(byCareer[1].share, 6 / 9)
  assert.equal(byCareer[2].share, 0)
  assert.equal(byCareer[1].subjects, 2)
})

test('sin carreras no divide por cero', () => {
  const stats = profileStats([])
  assert.deepEqual(stats, { careers: 0, subjects: 0, sheets: 0, byCareer: [] })
})

test('shortId acorta el id para mostrarlo', () => {
  assert.equal(shortId('7f3a9b2c-1111-2222-3333-44445555c21e'), '7f3a…c21e')
  assert.equal(shortId(''), '')
  assert.equal(shortId(undefined), '')
})

test('initialOf toma la primera letra del email en mayúscula', () => {
  assert.equal(initialOf('nico@mail.com'), 'N')
  assert.equal(initialOf(''), '')
  assert.equal(initialOf(null), '')
})
