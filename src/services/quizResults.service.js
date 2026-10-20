/**
 * Resultados de las pruebas del Brote: intentos (`quiz_attempts`) y temas
 * flojos (`weak_topics`), migración 0007. Todo con la sesión del usuario: RLS
 * decide (políticas `_owner`). Ninguna escritura avisa "cambió el árbol"
 * (`notifies: false`): no son parte del explorador.
 * Ver docs/API_DOCS.md, docs/DB_SCHEMA.md y docs/features/assistant.md.
 */

import { createCrudService, fetchAllPages, translateError } from './crudService.js'
import { getSupabase } from './supabase.client.js'

const attempts = createCrudService({ table: 'quiz_attempts', orderBy: 'created_at', notifies: false })

const SCOPE_TYPES = ['sheet', 'subject', 'career', 'all']
const WEAK_COLUMNS = 'id, subject_id, sheet_id, topic, misses, last_missed_at'
/** Tope de ids por consulta `in(...)` (la URL de PostgREST tiene largo máximo). */
const IN_CHUNK = 100

/** @param {string[]} ids @returns {string[][]} */
function chunks(ids) {
  const out = []
  for (let i = 0; i < ids.length; i += IN_CHUNK) out.push(ids.slice(i, i + IN_CHUNK))
  return out
}

/** @param {unknown} list @returns {string[]} */
const uniqueIds = (list) => [...new Set((Array.isArray(list) ? list : []).filter((id) => typeof id === 'string' && id))]

/**
 * @typedef {Object} WeakTopic
 * @property {string} id
 * @property {string} subject_id
 * @property {string|null} sheet_id
 * @property {string} topic
 * @property {number} misses
 * @property {string} last_missed_at
 */

/**
 * Guarda un intento. `correct` nunca supera `total` (la base no tiene ese
 * CHECK): se valida acá y, si no cumple, no se guarda.
 * @param {{scope: {type: 'sheet'|'subject'|'career'|'all', id?: string}, total: number, correct: number}} params
 * @returns {Promise<import('../types/models.js').ServiceResult<Object>>}
 */
export async function saveAttempt({ scope, total, correct }) {
  if (!scope || !SCOPE_TYPES.includes(scope.type)) return { data: null, error: 'Alcance inválido.' }
  if (!Number.isInteger(total) || !Number.isInteger(correct) || total < 0 || correct < 0 || correct > total) {
    return { data: null, error: 'El puntaje de la prueba no es válido.' }
  }
  const scopeId = scope.type === 'all' ? null : scope.id ?? null
  return attempts.create({ scope_type: scope.type, scope_id: scopeId, total, correct }, undefined, { cache: false })
}

/**
 * Temas flojos del usuario, opcionalmente de una o varias materias. Pagina
 * (PostgREST corta en 1000 filas). Sin cache.
 * @param {string|string[]} [subjectId]
 * @returns {Promise<import('../types/models.js').ServiceResult<WeakTopic[]>>}
 */
export async function listWeakTopics(subjectId) {
  const ids = subjectId === undefined ? null : uniqueIds(Array.isArray(subjectId) ? subjectId : [subjectId])
  if (ids && ids.length === 0) return { data: [], error: null }
  try {
    const rows = []
    for (const part of ids ? chunks(ids) : [null]) {
      const { data, error } = await fetchAllPages((from, to) => {
        let query = getSupabase().from('weak_topics').select(WEAK_COLUMNS)
        if (part) query = query.in('subject_id', part)
        return query.order('last_missed_at', { ascending: false }).order('id', { ascending: true }).range(from, to)
      })
      if (error) return { data: [], error: translateError(error, 'No se pudieron leer tus temas flojos.') }
      rows.push(...data)
    }
    return { data: rows, error: null }
  } catch (error) {
    return { data: [], error: translateError(error, 'No se pudieron leer tus temas flojos.') }
  }
}

/**
 * Aplica el plan de `planWeakTopicUpdates`: upsert por la clave única
 * `(user_id, subject_id, topic)` (el `user_id` lo pone la base con
 * `default auth.uid()`) y borrado de los temas resueltos.
 * `misses` viene calculado en el cliente con las filas leídas justo antes:
 * dos pruebas terminadas a la vez pueden pisarse (límite conocido).
 * @param {{upserts: import('../lib/assistant/weakTopics.js').WeakTopicUpsert[], deletes: string[]}} plan
 * @returns {Promise<import('../types/models.js').ServiceResult<true>>}
 */
export async function applyWeakTopicUpdates({ upserts = [], deletes = [] } = {}) {
  const now = new Date().toISOString()
  const rows = (Array.isArray(upserts) ? upserts : []).map((u) => ({
    subject_id: u.subject_id,
    sheet_id: u.sheet_id ?? null,
    topic: u.topic,
    misses: u.misses,
    last_missed_at: now,
  }))
  const ids = uniqueIds(deletes)
  try {
    if (rows.length) {
      const { error } = await getSupabase().from('weak_topics').upsert(rows, { onConflict: 'user_id,subject_id,topic' })
      if (error) return { data: null, error: translateError(error, 'No se pudieron guardar tus temas flojos.') }
    }
    for (const part of chunks(ids)) {
      const { error } = await getSupabase().from('weak_topics').delete().in('id', part)
      if (error) return { data: null, error: translateError(error, 'No se pudieron actualizar tus temas flojos.') }
    }
    return { data: true, error: null }
  } catch (error) {
    return { data: null, error: translateError(error, 'No se pudieron guardar tus temas flojos.') }
  }
}

/**
 * Hojas y materias **vivas** (fuera de la papelera) que nombra una prueba:
 * para saber a qué materia va cada tema fallado y mostrar la fecha de la hoja.
 * @param {{sheetIds?: string[], subjectIds?: string[]}} params
 * @returns {Promise<import('../types/models.js').ServiceResult<{
 *   sheets: Record<string, {subject_id: string, created_at: string}>,
 *   subjects: Record<string, {career_id: string}>
 * }>>}
 */
export async function resolveQuizSources({ sheetIds = [], subjectIds = [] } = {}) {
  /** @type {Record<string, {subject_id: string, created_at: string}>} */
  const sheets = {}
  /** @type {Record<string, {career_id: string}>} */
  const subjects = {}
  const fallback = 'No se pudieron leer las hojas de la prueba.'
  try {
    for (const part of chunks(uniqueIds(sheetIds))) {
      const { data, error } = await getSupabase()
        .from('sheets').select('id, subject_id, created_at').in('id', part).is('deleted_at', null)
      if (error) return { data: { sheets, subjects }, error: translateError(error, fallback) }
      for (const row of data ?? []) sheets[row.id] = { subject_id: row.subject_id, created_at: row.created_at }
    }
    const wanted = uniqueIds([...subjectIds, ...Object.values(sheets).map((s) => s.subject_id)])
    for (const part of chunks(wanted)) {
      const { data, error } = await getSupabase()
        .from('subjects').select('id, career_id').in('id', part).is('deleted_at', null)
      if (error) return { data: { sheets, subjects }, error: translateError(error, fallback) }
      for (const row of data ?? []) subjects[row.id] = { career_id: row.career_id }
    }
    // Una hoja viva de una materia en la papelera no cuenta como viva.
    for (const [id, sheet] of Object.entries(sheets)) if (!subjects[sheet.subject_id]) delete sheets[id]
    return { data: { sheets, subjects }, error: null }
  } catch (error) {
    return { data: { sheets, subjects }, error: translateError(error, fallback) }
  }
}
