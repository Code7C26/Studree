import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatCountdown, formatRelativeTime, formatDateTime, formatShortDate, formatDayMonth, formatMonthTitle,
} from './dates.js'

test('formatCountdown', () => {
  assert.deepEqual([0, 1, -1, 3, -3].map((d) => formatCountdown(d, 'es')), ['hoy', 'mañana', 'ayer', 'en 3 días', 'hace 3 días'])
  assert.deepEqual([0, 1, -1, 3, -3].map((d) => formatCountdown(d, 'en')), ['today', 'tomorrow', 'yesterday', 'in 3 days', '3 days ago'])
})

test('formatRelativeTime', () => {
  const now = new Date('2026-10-20T12:00:00')
  const at = (iso, lang) => formatRelativeTime(iso, now, lang)
  assert.deepEqual(
    ['2026-10-20T11:59:30', '2026-10-20T11:45:00', '2026-10-20T11:00:00', '2026-10-20T10:00:00', '2026-10-19T12:00:00', '2026-10-17T12:00:00', '2026-08-01T12:00:00'].map((iso) => at(iso, 'es')),
    ['recién', 'hace 15 min', 'hace 1 hora', 'hace 2 horas', 'hace 1 día', 'hace 3 días', 'el 01/08/2026'],
  )
  assert.deepEqual(
    ['2026-10-20T11:59:30', '2026-10-20T11:45:00', '2026-10-20T11:00:00', '2026-10-20T10:00:00', '2026-10-19T12:00:00', '2026-10-17T12:00:00', '2026-08-01T12:00:00'].map((iso) => at(iso, 'en')),
    ['just now', '15 min ago', '1 hour ago', '2 hours ago', '1 day ago', '3 days ago', 'on 08/01/2026'],
  )
})

test('formatDateTime, formatShortDate, formatDayMonth y formatMonthTitle', () => {
  const now = new Date('2025-11-01T00:00:00')
  assert.equal(formatDateTime('2025-10-14T18:30:00', now, 'es'), 'Martes 14/10 · 18:30')
  assert.equal(formatDateTime('2025-10-14T18:30:00', now, 'en'), 'Tuesday 10/14 · 6:30 PM')
  assert.equal(formatShortDate('2026-10-20', 'es'), 'mar 20/10')
  assert.equal(formatShortDate('2026-10-20', 'en'), 'Tue 10/20')
  assert.equal(formatDayMonth('2026-10-20', 'es'), '20/10')
  assert.equal(formatDayMonth('2026-10-20', 'en'), '10/20')
  assert.equal(formatMonthTitle(2026, 9, 'es'), 'Octubre 2026')
  assert.equal(formatMonthTitle(2026, 9, 'en'), 'October 2026')
})

test('sin idioma explícito el castellano es el de siempre (Node no tiene window)', () => {
  assert.equal(formatCountdown(1), 'mañana')
  assert.equal(formatDayMonth('2026-10-20'), '20/10')
})
