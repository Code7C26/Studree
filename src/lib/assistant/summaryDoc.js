// Documento de resumen del Brote: de la fila de `summaries` a la interfaz, de
// la interfaz a Markdown/PDF. Puro: sin React ni services.

/**
 * @typedef {Object} SummaryPayload  Evento SSE `summary`.
 * @property {string} title
 * @property {Array<{heading: string, body: string}>} sections
 * @property {Array<{term: string, definition: string}>} keyConcepts
 * @property {Array<{sheetId: string, subjectId: string, date: string}>} sheets
 * @property {number} sheetCount
 * @property {number} totalSheets
 * @property {boolean} external
 */

/**
 * @typedef {Object} SummaryDoc
 * @property {string|null} id
 * @property {string} title
 * @property {string} createdAt  ISO.
 * @property {boolean} external
 * @property {number} sheetCount
 * @property {number} totalSheets
 * @property {SummaryPayload['sections']} sections
 * @property {SummaryPayload['keyConcepts']} keyConcepts
 * @property {SummaryPayload['sheets']} sheets
 * @property {'sheet'|'subject'|'career'|'all'} scopeType
 * @property {string|null} subjectId
 * @property {string|null} careerId
 */

const pad = (n) => String(n).padStart(2, '0')

/**
 * Fila de `summaries` → documento.
 * @param {Object} row
 * @returns {SummaryDoc}
 */
export function rowToSummary(row) {
  const content = row.content ?? {}
  return {
    id: row.id ?? null,
    title: row.title,
    createdAt: row.created_at,
    external: Boolean(row.external),
    sheetCount: row.sheet_count ?? 0,
    totalSheets: row.total_sheets ?? 0,
    sections: Array.isArray(content.sections) ? content.sections : [],
    keyConcepts: Array.isArray(content.keyConcepts) ? content.keyConcepts : [],
    sheets: Array.isArray(content.sheets) ? content.sheets : [],
    scopeType: row.scope_type,
    subjectId: row.subject_id ?? null,
    careerId: row.career_id ?? null,
  }
}

/**
 * Fila de insert (sin `id`, `user_id` ni `created_at`: los pone la base).
 * @param {SummaryPayload} payload
 * @param {{scope: {type: 'sheet'|'subject'|'career'|'all', id?: string}, subjectId: string|null, careerId: string|null}} meta
 */
export function buildSummaryRow(payload, meta) {
  return {
    scope_type: meta.scope.type,
    scope_id: meta.scope.type === 'all' ? null : (meta.scope.id ?? null),
    subject_id: meta.subjectId,
    career_id: meta.careerId,
    title: payload.title,
    external: Boolean(payload.external),
    sheet_count: payload.sheetCount,
    total_sheets: payload.totalSheets,
    content: { sections: payload.sections, keyConcepts: payload.keyConcepts, sheets: payload.sheets },
  }
}

/**
 * Markdown para copiar o descargar. Fecha en hora local.
 * @param {SummaryDoc} doc
 * @returns {string}
 */
export function summaryToMarkdown(doc) {
  const d = new Date(doc.createdAt)
  const lines = [`*Resumen hecho por el Brote el ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}*`, '']
  for (const s of doc.sections) lines.push(`# ${s.heading}`, '', s.body, '')
  if (doc.keyConcepts.length > 0) {
    lines.push('# Conceptos clave', '')
    for (const k of doc.keyConcepts) lines.push(`- **${k.term}**: ${k.definition}`)
    lines.push('')
  }
  return lines.join('\n')
}

/**
 * Nombre de archivo del PDF: sin caracteres inválidos y con la fecha local.
 * @param {string} title
 * @param {string} iso
 * @returns {string}
 */
export function pdfFileName(title, iso) {
  const d = new Date(iso)
  const clean = String(title)
    .replace(/·/g, '-')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `${clean} - ${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}

/**
 * @param {number} sheetCount
 * @param {number} totalSheets
 * @returns {string}
 */
export function basedOnLabel(sheetCount, totalSheets) {
  const noun = (n) => (n === 1 ? 'hoja' : 'hojas')
  return sheetCount === totalSheets
    ? `basado en ${sheetCount} ${noun(sheetCount)}`
    : `basado en ${sheetCount} de ${totalSheets} ${noun(totalSheets)}`
}

/**
 * Fecha UTC `YYYY-MM-DD` → `dd/mm/aaaa`, partiendo el texto: con `new Date()` se
 * correría un día en husos al oeste de UTC.
 * @param {string} date
 * @returns {string}
 */
export function formatUtcDate(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date))
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(date)
}
