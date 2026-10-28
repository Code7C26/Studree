import { test } from 'node:test'
import assert from 'node:assert/strict'
import { weekdayHeaders, buildMonthGrid } from './calendar.js'

test('weekdayHeaders: iniciales de lunes a domingo según el idioma', () => {
  assert.deepEqual(weekdayHeaders('es'), ['L', 'M', 'M', 'J', 'V', 'S', 'D'])
  assert.deepEqual(weekdayHeaders('en'), ['M', 'T', 'W', 'T', 'F', 'S', 'S'])
})

test('buildMonthGrid sigue siendo de 6 semanas que empiezan el lunes', () => {
  const grid = buildMonthGrid(2026, 9)
  assert.equal(grid.length, 6)
  assert.equal(grid[0][0].key, '2026-09-28')
})
