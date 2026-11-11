import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeWeekSummary } from './summary.js'

test('describeWeekSummary arma las partes con singular y plural', () => {
  const es = describeWeekSummary({ dates: 1, tasks: 3, overdue: 2 }, 'es')
  assert.deepEqual(es.parts.map((p) => p.text), ['1 fecha', '3 tareas', '2 vencidas'])
  assert.equal(es.calm, false)
  assert.equal(describeWeekSummary({ dates: 2, tasks: 1, overdue: 1 }, 'es').parts[2].text, '1 vencida')
  const en = describeWeekSummary({ dates: 1, tasks: 3, overdue: 2 }, 'en')
  assert.deepEqual(en.parts.map((p) => p.text), ['1 date', '3 tasks', '2 overdue'])
})

test('describeWeekSummary: semana tranquila sin nada', () => {
  assert.equal(describeWeekSummary({ dates: 0, tasks: 0, overdue: 0 }, 'en').calm, true)
  assert.equal(describeWeekSummary({ dates: 0, tasks: 0, overdue: 0 }).parts.length, 2)
})
