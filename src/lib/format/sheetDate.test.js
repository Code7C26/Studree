import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatSheetDay } from './sheetDate.js'

test('formatSheetDay', () => {
  assert.equal(formatSheetDay('2026-10-17T12:00:00'), '17/10')
  assert.equal(formatSheetDay('2026-01-05T12:00:00'), '05/01')
})
