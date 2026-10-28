import { getLang, tIn } from '../i18n/index.js'
import { formatNumericDate } from '../format/dateParts.js'
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
 * @param {string} [lang]
 * @returns {string}
 */
export function summaryToMarkdown(doc, lang = getLang()) {
  const d = new Date(doc.createdAt)
  const lines = [`*${tIn(lang, 'study.summary.madeBy', { date: formatNumericDate(d, lang, true) })}*`, '']
  for (const s of doc.sections) lines.push(`# ${s.heading}`, '', s.body, '')
  if (doc.keyConcepts.length > 0) {
    lines.push(`# ${tIn(lang, 'study.summary.keyConcepts')}`, '')
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
 * @param {string} [lang]
 * @returns {string}
 */
export function basedOnLabel(sheetCount, totalSheets, lang = getLang()) {
  return sheetCount === totalSheets
    ? tIn(lang, 'study.summary.basedOnAll', { count: sheetCount })
    : tIn(lang, 'study.summary.basedOnSome', { sheets: sheetCount, count: totalSheets })
}

/**
 * Fecha UTC `YYYY-MM-DD` → `dd/mm/aaaa`, partiendo el texto: con `new Date()` se
 * correría un día en husos al oeste de UTC.
 * @param {string} date
 * @param {string} [lang]
 * @returns {string}
 */
export function formatUtcDate(date, lang = getLang()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date))
  if (!match) return String(date)
  return lang === 'en' ? `${match[2]}/${match[3]}/${match[1]}` : `${match[3]}/${match[2]}/${match[1]}`
}

const SCOPE_TYPES = ['sheet', 'subject', 'career', 'all']

/**
 * @param {'sheet'|'subject'|'career'|'all'} scopeType
 * @param {string} [lang]
 * @returns {string}
 */
export function summaryScopeLabel(scopeType, lang = getLang()) {
  return SCOPE_TYPES.includes(scopeType) ? tIn(lang, `study.summary.scope.${scopeType}`) : ''
}

/**
 * Título del resumen, armado en el cliente: "Resumen · Biología" (hoja/materia),
 * "Resumen · Toda la carrera" o "Resumen · Todas mis materias".
 * @param {{scopeType: 'sheet'|'subject'|'career'|'all', subjectName: string|null}} args
 * @param {string} [lang]
 * @returns {string}
 */
export function summaryTitle({ scopeType, subjectName }, lang = getLang()) {
  const bySubject = scopeType === 'sheet' || scopeType === 'subject'
  return tIn(lang, 'study.summary.title', { name: bySubject && subjectName ? subjectName : summaryScopeLabel(scopeType, lang) })
}
