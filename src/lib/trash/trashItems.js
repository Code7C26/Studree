/**
 * Textos de la papelera (puras, ver docs/features/trash.md). Siguen el idioma activo (Fase 18).
 */

import { buildPreview } from '../home/preview.js'
import { formatSheetDate } from '../format/sheetDate.js'
import { getLang, tIn } from '../i18n/index.js'

/** Días que algo pasa en la papelera antes de borrarse solo. */
export const TRASH_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Días enteros que le quedan a algo en la papelera (redondeo hacia arriba: el
 * último día cuenta como 1 hasta que vence).
 * @param {string} deletedAt - ISO.
 * @param {Date} [now]
 * @param {number} [days]
 * @returns {number}
 */
export function daysLeft(deletedAt, now = new Date(), days = TRASH_DAYS) {
  const remaining = days * DAY_MS - (now.getTime() - new Date(deletedAt).getTime())
  return Math.max(0, Math.ceil(remaining / DAY_MS))
}

/**
 * "a, b y c" / "a, b and c" según el idioma ('' si no hay nada).
 * @param {string[]} parts
 * @param {string} lang
 * @returns {string}
 */
function joinList(parts, lang) {
  if (parts.length <= 1) return parts.join('')
  return tIn(lang, 'trash.listAnd', { head: parts.slice(0, -1).join(', '), last: parts.at(-1) })
}

/**
 * "incluye 4 materias, 23 hojas y 2 adjuntos" ('' si no arrastra nada).
 * @param {Pick<import('../../types/models.js').TrashItem, 'subjects_count'|'sheets_count'|'attachments_count'>} item
 * @param {string} [lang]
 * @returns {string}
 */
export function describeContents(item, lang = getLang()) {
  const count = (key, value) => value > 0 && tIn(lang, `trash.counts.${key}`, { count: value })
  const parts = [
    count('subjects', item.subjects_count),
    count('sheets', item.sheets_count),
    count('attachments', item.attachments_count),
  ].filter(Boolean)
  if (parts.length === 0) return ''
  return tIn(lang, 'trash.includes', { list: joinList(parts, lang) })
}

/**
 * Cómo se nombra un elemento de la papelera. Las hojas no tienen título
 * (ADR-017): fecha + primer renglón.
 * @param {Pick<import('../../types/models.js').TrashItem, 'kind'|'label'|'sheet_created_at'>} item
 * @param {string} [lang]
 * @returns {string}
 */
export function trashItemTitle(item, lang = getLang()) {
  if (item.kind !== 'sheet') return item.label
  const date = formatSheetDate(item.sheet_created_at, new Date(), lang)
  const preview = buildPreview(item.label ?? '', 80)
  return preview ? tIn(lang, 'trash.sheetTitle', { date, preview }) : tIn(lang, 'trash.sheetTitleNoPreview', { date })
}

/**
 * Elementos de la papelera que se listan aparte pero cuelgan del que se va a
 * borrar para siempre (ej. una materia borrada el lunes y su carrera el
 * martes: borrar la carrera arrastra la materia). Para nombrarlos en la
 * confirmación.
 * @param {import('../../types/models.js').TrashItem[]} items - Lo listado ahora.
 * @param {import('../../types/models.js').TrashItem} target
 * @param {Set<string>} descendantIds - Ids de materias y hojas debajo de `target`.
 * @returns {import('../../types/models.js').TrashItem[]}
 */
export function nestedTrashItems(items, target, descendantIds) {
  if (target.kind === 'sheet') return []
  return items.filter((item) => item.id !== target.id && item.kind !== 'career' && descendantIds.has(item.id))
}

/**
 * Texto de la confirmación de "Borrar para siempre".
 * @param {import('../../types/models.js').TrashItem} item
 * @param {import('../../types/models.js').TrashItem[]} nested - De `nestedTrashItems`.
 * @param {string} [lang]
 * @returns {string}
 */
export function purgeMessage(item, nested, lang = getLang()) {
  const quote = (candidate) => tIn(lang, 'trash.quoted', { text: trashItemTitle(candidate, lang) })
  const also = nested.length > 0 ? tIn(lang, 'trash.purgeAlso', { list: joinList(nested.map(quote), lang) }) : ''
  return tIn(lang, 'trash.purgeMessage', { title: trashItemTitle(item, lang), also })
}
