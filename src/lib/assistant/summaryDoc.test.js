import { test } from 'node:test'
import assert from 'node:assert/strict'
import { basedOnLabel, buildSummaryRow, formatUtcDate, pdfFileName, rowToSummary, summaryToMarkdown } from './summaryDoc.js'

const payload = {
  title: 'Resumen · Biología',
  sections: [
    { heading: 'Célula', body: 'Unidad **básica**.' },
    { heading: 'ADN', body: '- doble hélice' },
  ],
  keyConcepts: [{ term: 'Mitosis', definition: 'División celular' }],
  sheets: [{ sheetId: 'h1', subjectId: 'S1', date: '2026-10-17' }],
  sheetCount: 1,
  totalSheets: 2,
  external: true,
}
const meta = { scope: { type: 'subject', id: 'S1' }, subjectId: 'S1', careerId: 'C1' }

test('pdfFileName', () => {
  assert.equal(pdfFileName('Resumen · Biología', '2026-10-22T15:00:00'), 'Resumen - Biología - 22-10-2026')
  assert.equal(pdfFileName('a/b:c*?', '2026-01-05T10:00:00'), 'a b c - 05-01-2026')
})

test('basedOnLabel', () => {
  assert.equal(basedOnLabel(12, 12), 'basado en 12 hojas')
  assert.equal(basedOnLabel(12, 20), 'basado en 12 de 20 hojas')
  assert.equal(basedOnLabel(1, 1), 'basado en 1 hoja')
})

test('buildSummaryRow', () => {
  assert.deepEqual(buildSummaryRow(payload, meta), {
    scope_type: 'subject',
    scope_id: 'S1',
    subject_id: 'S1',
    career_id: 'C1',
    title: 'Resumen · Biología',
    external: true,
    sheet_count: 1,
    total_sheets: 2,
    content: { sections: payload.sections, keyConcepts: payload.keyConcepts, sheets: payload.sheets },
  })
  assert.equal(buildSummaryRow(payload, { scope: { type: 'all' }, subjectId: null, careerId: null }).scope_id, null)
})

test('rowToSummary ida y vuelta', () => {
  const doc = rowToSummary({ ...buildSummaryRow(payload, meta), id: 'x1', created_at: '2026-10-22T15:00:00' })
  assert.equal(doc.id, 'x1')
  assert.equal(doc.createdAt, '2026-10-22T15:00:00')
  assert.equal(doc.scopeType, 'subject')
  assert.equal(doc.subjectId, 'S1')
  assert.equal(doc.careerId, 'C1')
  assert.equal(doc.sheetCount, 1)
  assert.equal(doc.totalSheets, 2)
  assert.deepEqual(doc.sections, payload.sections)
  assert.deepEqual(doc.keyConcepts, payload.keyConcepts)
  assert.deepEqual(doc.sheets, payload.sheets)
})

test('summaryToMarkdown', () => {
  const doc = rowToSummary({ ...buildSummaryRow(payload, meta), id: 'x1', created_at: '2026-10-22T15:00:00' })
  assert.equal(
    summaryToMarkdown(doc),
    [
      '*Resumen hecho por el Brote el 22/10/2026*',
      '',
      '# Célula',
      '',
      'Unidad **básica**.',
      '',
      '# ADN',
      '',
      '- doble hélice',
      '',
      '# Conceptos clave',
      '',
      '- **Mitosis**: División celular',
      '',
    ].join('\n'),
  )
  assert.ok(!summaryToMarkdown({ ...doc, keyConcepts: [] }).includes('Conceptos clave'))
})

test('formatUtcDate parte el string sin pasar por Date (sin corrimiento de día)', () => {
  assert.equal(formatUtcDate('2026-10-17'), '17/10/2026')
  assert.equal(formatUtcDate('2026-01-01'), '01/01/2026')
})

test('formatUtcDate devuelve el texto tal cual si no es una fecha', () => {
  assert.equal(formatUtcDate('ayer'), 'ayer')
})

test('summaryTitle y summaryScopeLabel', async () => {
  const { summaryTitle, summaryScopeLabel } = await import('./summaryDoc.js')
  assert.equal(summaryTitle({ scopeType: 'subject', subjectName: 'Biología' }), 'Resumen · Biología')
  assert.equal(summaryTitle({ scopeType: 'sheet', subjectName: 'Biología' }), 'Resumen · Biología')
  assert.equal(summaryTitle({ scopeType: 'sheet', subjectName: null }), 'Resumen · Una hoja')
  assert.equal(summaryTitle({ scopeType: 'career', subjectName: 'Biología' }), 'Resumen · Toda la carrera')
  assert.equal(summaryTitle({ scopeType: 'all', subjectName: null }), 'Resumen · Todas mis materias')
  assert.equal(summaryScopeLabel('sheet'), 'Una hoja')
  assert.equal(summaryScopeLabel('subject'), 'Una materia')
  assert.equal(summaryScopeLabel('career'), 'Toda la carrera')
  assert.equal(summaryScopeLabel('all'), 'Todas mis materias')
})
