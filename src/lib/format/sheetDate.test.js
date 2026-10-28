import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatSheetDay } from './sheetDate.js'

test('formatSheetDay', () => {
  assert.equal(formatSheetDay('2026-10-17T12:00:00'), '17/10')
  assert.equal(formatSheetDay('2026-01-05T12:00:00'), '05/01')
})

import { formatSheetDate, formatSheetDateLong } from './sheetDate.js'

const NOW = new Date('2025-11-01T00:00:00')

test('formatSheetDate en castellano no cambia', () => {
  assert.equal(formatSheetDate('2025-10-14T18:30:00', NOW, 'es'), 'Martes 14/10 · 18:30')
  assert.equal(formatSheetDate('2024-03-04T09:05:00', NOW, 'es'), 'Lunes 04/03/2024 · 09:05')
})

test('formatSheetDate en inglés: día de la semana, mes/día y hora de 12 horas', () => {
  assert.equal(formatSheetDate('2025-10-14T18:30:00', NOW, 'en'), 'Tuesday 10/14 · 6:30 PM')
  assert.equal(formatSheetDate('2024-03-04T09:05:00', NOW, 'en'), 'Monday 03/04/2024 · 9:05 AM')
  assert.equal(formatSheetDate('2025-10-14T00:05:00', NOW, 'en'), 'Tuesday 10/14 · 12:05 AM')
  assert.equal(formatSheetDate('2025-10-14T12:00:00', NOW, 'en'), 'Tuesday 10/14 · 12:00 PM')
})

test('formatSheetDateLong siempre lleva el año', () => {
  assert.equal(formatSheetDateLong('2025-10-14T18:30:00', 'es'), 'Martes 14/10/2025 · 18:30')
  assert.equal(formatSheetDateLong('2025-10-14T18:30:00', 'en'), 'Tuesday 10/14/2025 · 6:30 PM')
})

test('formatSheetDay respeta el idioma', () => {
  assert.equal(formatSheetDay('2026-10-17T12:00:00', 'es'), '17/10')
  assert.equal(formatSheetDay('2026-10-17T12:00:00', 'en'), '10/17')
})
