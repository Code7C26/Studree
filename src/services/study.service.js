/**
 * "Mi estudio" (migración 0009): resúmenes guardados (`summaries`) y registro
 * de exámenes (`quiz_attempts`). Todo con la sesión del usuario: RLS decide.
 * Sin cache y sin avisar "cambió el árbol" (`notifies: false`): no son parte
 * del explorador. Las listas descartan lo de materias o carreras en la papelera.
 * Ver docs/API_DOCS.md, docs/DB_SCHEMA.md y docs/features/assistant.md.
 */

import { createCrudService, fetchAllPages, translateError } from './crudService.js'
import { getSupabase } from './supabase.client.js'
import { filterLiveStudyItems } from '../lib/assistant/studyItems.js'
import { t } from '../lib/i18n/index.js'

const summaries = createCrudService({ table: 'summaries', orderBy: 'created_at', notifies: false })
const attempts = createCrudService({ table: 'quiz_attempts', orderBy: 'created_at', notifies: false })

const EMBEDS = 'subject:subjects(id, name, deleted_at), career:careers(id, name, deleted_at)'
/** Listas: sin `content` ni `detail` (pesan hasta 256 KB por fila). */
const SUMMARY_LIST = `id, scope_type, scope_id, subject_id, career_id, title, external, sheet_count, total_sheets, created_at, ${EMBEDS}`
const ATTEMPT_LIST = `id, scope_type, scope_id, subject_id, career_id, title, total, correct, created_at, ${EMBEDS}`
const SUMMARY_FIELDS = ['scope_type', 'scope_id', 'subject_id', 'career_id', 'title', 'external', 'sheet_count', 'total_sheets', 'content']

/**
 * Lista paginada, más nueva primero, solo filas vivas.
 * @param {string} table
 * @param {string} columns
 * @param {string} fallback
 * @returns {Promise<import('../types/models.js').ServiceResult<Object[]>>}
 */
async function listLive(table, columns, fallback) {
  try {
    const { data, error } = await fetchAllPages((from, to) =>
      getSupabase().from(table).select(columns)
        .order('created_at', { ascending: false }).order('id', { ascending: true }).range(from, to),
    )
    if (error) return { data: [], error: translateError(error, fallback) }
    return { data: filterLiveStudyItems(data), error: null }
  } catch (error) {
    return { data: [], error: translateError(error, fallback) }
  }
}

/**
 * Una fila completa por id; `null` si no existe o su materia/carrera está en la papelera.
 * @param {string} table
 * @param {string} id
 * @param {string} fallback
 * @returns {Promise<import('../types/models.js').ServiceResult<Object|null>>}
 */
async function getLive(table, id, fallback) {
  try {
    const { data, error } = await getSupabase().from(table).select(`*, ${EMBEDS}`).eq('id', id).maybeSingle()
    if (error) return { data: null, error: translateError(error, fallback) }
    return { data: data && filterLiveStudyItems([data]).length ? data : null, error: null }
  } catch (error) {
    return { data: null, error: translateError(error, fallback) }
  }
}

/**
 * Guarda un resumen. Solo pasan los campos de la tabla (`user_id` lo pone la base).
 * @param {{scope_type: string, scope_id?: string|null, subject_id?: string|null, career_id?: string|null, title: string, external?: boolean, sheet_count?: number, total_sheets?: number, content: Object}} row
 * @returns {Promise<import('../types/models.js').ServiceResult<{id: string}>>}
 */
export async function saveSummary(row) {
  if (!row || !row.title || !row.content) return { data: null, error: t('study.errors.summaryInvalid') }
  const values = Object.fromEntries(SUMMARY_FIELDS.filter((k) => row[k] !== undefined).map((k) => [k, row[k]]))
  const { data, error } = await summaries.create(values, undefined, { cache: false })
  return { data, error: error === t('errors.crud.create') ? t('study.errors.summarySave') : error }
}

/** @returns {Promise<import('../types/models.js').ServiceResult<Object[]>>} */
export function listSummaries() {
  return listLive('summaries', SUMMARY_LIST, t('study.errors.summariesLoad'))
}

/**
 * @param {string} id
 * @returns {Promise<import('../types/models.js').ServiceResult<Object|null>>}
 */
export function getSummary(id) {
  return getLive('summaries', id, t('study.errors.summaryLoad'))
}

/**
 * @param {string} id
 * @returns {Promise<import('../types/models.js').ServiceResult<null>>}
 */
export async function deleteSummary(id) {
  const { error } = await summaries.remove(id, undefined, { cache: false })
  return { data: null, error: error === t('errors.crud.delete') ? t('study.errors.summaryDelete') : error }
}

/** @returns {Promise<import('../types/models.js').ServiceResult<Object[]>>} */
export function listQuizAttempts() {
  return listLive('quiz_attempts', ATTEMPT_LIST, t('study.errors.quizzesLoad'))
}

/**
 * @param {string} id
 * @returns {Promise<import('../types/models.js').ServiceResult<Object|null>>} Con `detail`.
 */
export function getQuizAttempt(id) {
  return getLive('quiz_attempts', id, t('study.errors.quizLoad'))
}

/**
 * @param {string} id
 * @returns {Promise<import('../types/models.js').ServiceResult<null>>}
 */
export async function deleteQuizAttempt(id) {
  const { error } = await attempts.remove(id, undefined, { cache: false })
  return { data: null, error: error === t('errors.crud.delete') ? t('study.errors.quizDelete') : error }
}
