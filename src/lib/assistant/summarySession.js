// Ciclo de vida del resumen que acaba de armar el Brote. Puro: sin React ni services.
// Se guarda UNA sola vez: `saving` → `saved` | `error`; reintentar solo desde `error`.

import { buildSummaryRow, rowToSummary } from './summaryDoc.js'

/**
 * @typedef {import('./summaryDoc.js').SummaryDoc} SummaryDoc
 * @typedef {import('./summaryDoc.js').SummaryPayload} SummaryPayload
 */

/**
 * @typedef {Object} SummaryMeta  Lo que se toma al lanzar el pedido.
 * @property {{type: 'sheet'|'subject'|'career'|'all', id?: string}} scope
 * @property {string|null} subjectId
 * @property {string|null} careerId
 * @property {string|null} subjectName  Para el título si el modelo no trajo uno.
 */

/**
 * @typedef {Object} SummarySession
 * @property {number} key  Cambia con cada resumen (el panel lo abre solo).
 * @property {SummaryDoc} doc
 * @property {'saving'|'saved'|'error'} status
 * @property {string|null} savedId
 * @property {string|null} saveError
 */

export const SUMMARY_SAVE_FAILED = 'No se pudo guardar el resumen.'

/**
 * Fila a insertar para un resumen recién llegado (título de respaldo si vino vacío).
 * @param {SummaryPayload} payload
 * @param {SummaryMeta} meta
 */
export function summaryRowFor(payload, meta) {
  const title = String(payload.title ?? '').trim() || `Resumen${meta.subjectName ? ` · ${meta.subjectName}` : ''}`
  return buildSummaryRow({ ...payload, title }, meta)
}

/**
 * Sesión nueva en `saving`: el documento sale de la misma fila que se va a guardar
 * (`id: null` y fecha de ahora hasta que se guarde).
 * @param {number} key
 * @param {SummaryPayload} payload
 * @param {SummaryMeta} meta
 * @param {string} nowIso
 * @returns {SummarySession}
 */
export function createSummarySession(key, payload, meta, nowIso) {
  const doc = rowToSummary({ ...summaryRowFor(payload, meta), id: null, created_at: nowIso })
  return { key, doc, status: 'saving', savedId: null, saveError: null }
}

/**
 * Resultado del guardado, solo si sigue siendo el mismo resumen y estaba guardándose o en error.
 * @param {SummarySession|null} session
 * @param {number} key
 * @param {{id: string|null, error: string|null}} result
 * @returns {SummarySession|null}
 */
export function finishSummarySave(session, key, { id, error }) {
  if (!session || session.key !== key || session.status === 'saved') return session
  if (id) return { ...session, doc: { ...session.doc, id }, status: 'saved', savedId: id, saveError: null }
  return { ...session, status: 'error', saveError: error || SUMMARY_SAVE_FAILED }
}

/** ¿Se puede reintentar? Solo con error y sin fila (nunca se inserta dos veces). */
export function canRetrySummarySave(session) {
  return session?.status === 'error' && !session.savedId
}

/** Vuelve a `saving` para reintentar (solo desde `error`). */
export function startSummaryRetry(session) {
  return canRetrySummarySave(session) ? { ...session, status: 'saving', saveError: null } : session
}
