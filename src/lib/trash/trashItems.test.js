import { test } from 'node:test'
import assert from 'node:assert/strict'
import { daysLeft, describeContents, trashItemTitle, TRASH_DAYS, nestedTrashItems, purgeMessage } from './trashItems.js'

const now = new Date('2026-10-20T12:00:00Z')

test('daysLeft cuenta hacia abajo desde 30 y nunca es negativo', () => {
  assert.equal(TRASH_DAYS, 30)
  assert.equal(daysLeft('2026-10-20T12:00:00Z', now), 30)
  assert.equal(daysLeft('2026-10-19T12:00:00Z', now), 29)
  assert.equal(daysLeft('2026-10-19T11:00:00Z', now), 29) // 1 día y 1 hora → quedan 28,96 → 29
  assert.equal(daysLeft('2026-09-01T00:00:00Z', now), 0)
})

test('describeContents arma la frase con lo que arrastra', () => {
  assert.equal(
    describeContents({ kind: 'career', subjects_count: 4, sheets_count: 23, attachments_count: 2 }),
    'incluye 4 materias, 23 hojas y 2 adjuntos',
  )
  assert.equal(describeContents({ kind: 'subject', subjects_count: 0, sheets_count: 1, attachments_count: 0 }), 'incluye 1 hoja')
  assert.equal(describeContents({ kind: 'sheet', subjects_count: 0, sheets_count: 0, attachments_count: 1 }), 'incluye 1 adjunto')
  assert.equal(describeContents({ kind: 'sheet', subjects_count: 0, sheets_count: 0, attachments_count: 0 }), '')
})

test('trashItemTitle: nombre para carreras y materias; fecha y primer renglón para hojas', () => {
  assert.equal(trashItemTitle({ kind: 'career', label: 'Biología' }), 'Biología')
  const sheet = trashItemTitle({ kind: 'sheet', label: '# Mitosis\n\nFases…', sheet_created_at: '2026-10-14T21:30:00Z' })
  assert.match(sheet, /14\/10/)
  assert.match(sheet, /^Hoja del .*: Mitosis/)
  // Sin texto: solo la fecha (la hora trae ":", por eso se busca ": " con espacio).
  const bare = trashItemTitle({ kind: 'sheet', label: '', sheet_created_at: '2026-10-14T21:30:00Z' })
  assert.match(bare, /^Hoja del .+\d{2}:\d{2}$/)
  assert.doesNotMatch(bare, /: /)
})

test('nestedTrashItems: los otros elementos listados que cuelgan del que se borra', () => {
  const career = { kind: 'career', id: 'c1', label: 'Bio' }
  const subject = { kind: 'subject', id: 's1', label: 'Genética' }
  const sheet = { kind: 'sheet', id: 'h1', label: '# Mitosis', sheet_created_at: '2026-10-14T21:30:00Z' }
  const other = { kind: 'sheet', id: 'h9', label: 'Otra', sheet_created_at: '2026-10-14T21:30:00Z' }
  const items = [career, subject, sheet, other]
  assert.deepEqual(nestedTrashItems(items, career, new Set(['s1', 'h1', 'h2'])), [subject, sheet])
  // Una hoja no tiene descendientes; el propio elemento nunca se lista.
  assert.deepEqual(nestedTrashItems(items, sheet, new Set(['h1'])), [])
})

test('purgeMessage nombra lo que también se borra', () => {
  const career = { kind: 'career', id: 'c1', label: 'Bio' }
  const subject = { kind: 'subject', id: 's1', label: 'Genética' }
  assert.equal(
    purgeMessage(career, []),
    'Se borra para siempre «Bio», con todo lo que incluye. No se puede deshacer.',
  )
  assert.equal(
    purgeMessage(career, [subject, { kind: 'subject', id: 's2', label: 'Física' }]),
    'Se borra para siempre «Bio», con todo lo que incluye. También se borran para siempre: «Genética» y «Física». No se puede deshacer.',
  )
})

test('en inglés: contenidos, título de hoja y confirmación', () => {
  assert.equal(
    describeContents({ kind: 'career', subjects_count: 4, sheets_count: 23, attachments_count: 2 }, 'en'),
    'includes 4 subjects, 23 sheets and 2 attachments',
  )
  assert.equal(describeContents({ kind: 'subject', subjects_count: 0, sheets_count: 1, attachments_count: 0 }, 'en'), 'includes 1 sheet')
  const bare = trashItemTitle({ kind: 'sheet', label: '', sheet_created_at: '2026-10-14T21:30:00Z' }, 'en')
  assert.match(bare, /^Sheet from /)
  const career = { kind: 'career', id: 'c1', label: 'Bio' }
  const subject = { kind: 'subject', id: 's1', label: 'Genetics' }
  assert.equal(
    purgeMessage(career, [subject], 'en'),
    'This permanently deletes “Bio” and everything it includes. Also permanently deleted: “Genetics”. This cannot be undone.',
  )
})
