/**
 * Textos de la papelera (puras, ver docs/features/trash.md).
 */

import { buildPreview } from '../home/preview.js'
import { formatSheetDate } from '../format/sheetDate.js'

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

/** @param {number} count @param {string} one @param {string} many */
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`

/**
 * "incluye 4 materias, 23 hojas y 2 adjuntos" ('' si no arrastra nada).
 * @param {Pick<import('../../types/models.js').TrashItem, 'subjects_count'|'sheets_count'|'attachments_count'>} item
 * @returns {string}
 */
export function describeContents(item) {
  const parts = [
    item.subjects_count > 0 && plural(item.subjects_count, 'materia', 'materias'),
    item.sheets_count > 0 && plural(item.sheets_count, 'hoja', 'hojas'),
    item.attachments_count > 0 && plural(item.attachments_count, 'adjunto', 'adjuntos'),
  ].filter(Boolean)
  if (parts.length === 0) return ''
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`
  return `incluye ${list}`
}

/**
 * Cómo se nombra un elemento de la papelera. Las hojas no tienen título
 * (ADR-017): fecha + primer renglón.
 * @param {Pick<import('../../types/models.js').TrashItem, 'kind'|'label'|'sheet_created_at'>} item
 * @returns {string}
 */
export function trashItemTitle(item) {
  if (item.kind !== 'sheet') return item.label
  const date = formatSheetDate(item.sheet_created_at)
  const preview = buildPreview(item.label ?? '', 80)
  return preview ? `Hoja del ${date}: ${preview}` : `Hoja del ${date}`
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

/** @param {string[]} parts */
const joinList = (parts) => (parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`)

/**
 * Texto de la confirmación de "Borrar para siempre".
 * @param {import('../../types/models.js').TrashItem} item
 * @param {import('../../types/models.js').TrashItem[]} nested - De `nestedTrashItems`.
 * @returns {string}
 */
export function purgeMessage(item, nested) {
  const also = nested.length > 0
    ? ` También se borran para siempre: ${joinList(nested.map((candidate) => `«${trashItemTitle(candidate)}»`))}.`
    : ''
  return `Se borra para siempre «${trashItemTitle(item)}», con todo lo que incluye.${also} No se puede deshacer.`
}
