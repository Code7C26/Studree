import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeYearLayout, startTargets, startPosition, yearHeaderId } from './careerStart.js'
import { computeSubjectStates } from './subjectStatus.js'

const SIZE = { width: 220, height: 110 }
const subject = (id, extra = {}) => ({ id, name: id, status: 'pendiente', position: 0, year: null, ...extra })

test('computeYearLayout: una columna por año, en orden, y "sin año" al final', () => {
  const subjects = [subject('a', { year: 2 }), subject('b', { year: 1 }), subject('c'), subject('d', { year: 1, position: 1 })]
  const { positions, columns } = computeYearLayout(subjects, SIZE)
  assert.deepEqual(columns.map((column) => column.year), [1, 2, null])
  assert.equal(positions.get('b').x, positions.get('d').x)
  assert.ok(positions.get('d').y > positions.get('b').y)
  assert.ok(positions.get('a').x > positions.get('b').x)
  assert.ok(positions.get('c').x > positions.get('a').x)
  // Debajo del título de su columna.
  assert.ok(positions.get('b').y > columns[0].y)
})

test('startTargets: con años, la línea de inicio va a cada año', () => {
  const columns = [{ year: 1 }, { year: null }]
  assert.deepEqual(startTargets([subject('a', { year: 1 })], [], columns), [yearHeaderId(1), yearHeaderId(null)])
})

test('startTargets: sin años, va a cada materia que no depende de otra', () => {
  const links = [{ subject_id: 'b', requires_id: 'a', kind: 'relacion' }]
  assert.deepEqual(startTargets([subject('a'), subject('b'), subject('c')], links, []), ['a', 'c'])
})

test('startPosition: a la izquierda de todo y a media altura', () => {
  const position = startPosition([{ x: 100, y: 0 }, { x: 400, y: 200 }], SIZE)
  assert.ok(position.x < 100)
  assert.equal(position.y, 100 + SIZE.height / 2 - 28)
})

test('una materia "relacionada" no bloquea ni cuenta como requisito', () => {
  const subjects = [subject('a'), subject('b')]
  const states = computeSubjectStates(subjects, [{ subject_id: 'b', requires_id: 'a', kind: 'relacion' }])
  assert.equal(states.get('b').blocked, false)
  assert.deepEqual(states.get('b').missingToPass, [])
})
