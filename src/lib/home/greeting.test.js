import { test } from 'node:test'
import assert from 'node:assert/strict'
import { greetingFor, formatLongDay, describeNextDate } from './greeting.js'

test('greetingFor según la hora y el idioma', () => {
  const at = (hour) => new Date(`2026-10-15T${String(hour).padStart(2, '0')}:00:00`)
  assert.deepEqual([9, 14, 22].map((h) => greetingFor(at(h), 'es')), ['Buenos días.', 'Buenas tardes.', 'Buenas noches.'])
  assert.deepEqual([9, 14, 22].map((h) => greetingFor(at(h), 'en')), ['Good morning.', 'Good afternoon.', 'Good evening.'])
})

test('formatLongDay', () => {
  const day = new Date('2026-10-15T12:00:00')
  assert.equal(formatLongDay(day, 'es'), 'Jueves 15 de octubre')
  assert.equal(formatLongDay(day, 'en'), 'Thursday, October 15')
})

test('describeNextDate: hoy, mañana y en N días', () => {
  assert.deepEqual([0, -2, 1, 5].map((d) => describeNextDate('Parcial', d, 'es')), ['hoy tenés Parcial', 'hoy tenés Parcial', 'mañana tenés Parcial', 'Parcial en 5 días'])
  assert.deepEqual([0, 1, 5].map((d) => describeNextDate('Parcial', d, 'en')), ['you have Parcial today', 'you have Parcial tomorrow', 'Parcial in 5 days'])
})
