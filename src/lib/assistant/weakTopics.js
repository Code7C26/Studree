// Temas flojos: qué filas de `weak_topics` crear, sumar o borrar después de
// una prueba. Puro: sin React ni services (el service aplica el plan).
//
// Un tema se identifica por (materia, tema). El tema se compara normalizado
// (espacios y mayúsculas, igual que el servidor en `weak_review`) y, si ya
// existe, se reutiliza el texto guardado para que el upsert pise esa fila.

/** Largo máximo del tema (`weak_topics.topic` es 1..200). */
export const TOPIC_MAX = 200

const normalize = (text) => String(text ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
const clean = (text) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, TOPIC_MAX)
const keyOf = (subjectId, topic) => `${subjectId}\u0000${normalize(topic)}`

/**
 * @typedef {Object} WeakTopicRow
 * @property {string} id
 * @property {string} subject_id
 * @property {string|null} [sheet_id]
 * @property {string} topic
 * @property {number} misses
 */

/**
 * @typedef {Object} WeakTopicUpsert
 * @property {string} subject_id
 * @property {string|null} [sheet_id]
 * @property {string} topic
 * @property {number} misses
 */

/**
 * Plan de cambios en `weak_topics` tras una prueba.
 * - Un tema fallado suma **un** error por prueba (aunque se falle dos veces).
 * - Un acierto solo borra el tema en un repaso (`isReview`) y si no se falló
 *   en esa misma prueba; en un examen normal los aciertos no tocan nada.
 * - Se descartan resultados sin materia, sin tema o sin corregir (`correct`
 *   no booleano).
 * `misses` se calcula con las filas leídas justo antes (ver límite conocido en
 * docs/features/assistant.md: dos pruebas simultáneas pueden pisarse).
 * @param {{existing?: WeakTopicRow[], results?: Array<{subject_id: string, sheet_id?: string|null, topic: string, correct: boolean|null}>, isReview?: boolean}} input
 * @returns {{upserts: WeakTopicUpsert[], deletes: string[]}}
 */
export function planWeakTopicUpdates({ existing = [], results = [], isReview = false } = {}) {
  const current = new Map()
  for (const row of Array.isArray(existing) ? existing : []) {
    if (row && typeof row.subject_id === 'string' && typeof row.topic === 'string') {
      current.set(keyOf(row.subject_id, row.topic), row)
    }
  }

  /** @type {Map<string, {subject_id: string, topic: string, sheet_id: string|null, missed: boolean}>} */
  const seen = new Map()
  for (const r of Array.isArray(results) ? results : []) {
    if (!r || typeof r.subject_id !== 'string' || !r.subject_id || typeof r.correct !== 'boolean') continue
    const topic = clean(r.topic)
    if (!topic) continue
    const key = keyOf(r.subject_id, topic)
    const entry = seen.get(key) ?? { subject_id: r.subject_id, topic, sheet_id: null, missed: false }
    if (!r.correct) {
      entry.missed = true
      if (typeof r.sheet_id === 'string' && r.sheet_id) entry.sheet_id = r.sheet_id
    }
    seen.set(key, entry)
  }

  /** @type {WeakTopicUpsert[]} */
  const upserts = []
  /** @type {string[]} */
  const deletes = []
  for (const [key, entry] of seen) {
    const row = current.get(key)
    if (entry.missed) {
      upserts.push({
        subject_id: entry.subject_id,
        sheet_id: entry.sheet_id ?? row?.sheet_id ?? null,
        topic: row ? row.topic : entry.topic,
        misses: (Number.isInteger(row?.misses) && row.misses > 0 ? row.misses : 0) + 1,
      })
    } else if (isReview && row && typeof row.id === 'string') {
      deletes.push(row.id)
    }
  }
  return { upserts, deletes }
}

/**
 * A qué materia (y hoja) va el tema de cada pregunta. Nunca adivina: si la
 * materia no se puede resolver a una **viva** dentro del alcance de la prueba,
 * la pregunta se saltea (no se escribe como tema flojo).
 * - Pregunta con hoja resuelta: la materia de esa hoja, si está viva y en el alcance.
 * - Alcance hoja o materia: además, sin hoja resuelta se usa la materia del alcance
 *   (todas las fuentes de la prueba son de esa materia), si está viva.
 * - Alcance carrera o todas: sin hoja resuelta, se saltea.
 * @param {Array<{id: string, sheetId?: string}>} questions
 * @param {Object} ctx
 * @param {{type: 'sheet'|'subject'|'career'|'all', id?: string}} ctx.scope  El alcance con que se pidió la prueba.
 * @param {string|null} ctx.scopeSubjectId  Materia del alcance hoja/materia.
 * @param {Record<string, {subject_id: string}>} ctx.sheets  Hojas vivas por id.
 * @param {Record<string, {career_id: string}>} ctx.subjects  Materias vivas por id.
 * @returns {Record<string, {subject_id: string, sheet_id: string|null}>}
 */
export function attachSubjects(questions, { scope, scopeSubjectId, sheets, subjects }) {
  const live = (id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(subjects ?? {}, id)
  const narrow = scope?.type === 'sheet' || scope?.type === 'subject'
  const inScope = (subjectId) => {
    if (!live(subjectId)) return false
    if (narrow) return subjectId === scopeSubjectId
    if (scope?.type === 'career') return subjects[subjectId]?.career_id === scope.id
    return scope?.type === 'all'
  }
  /** @type {Record<string, {subject_id: string, sheet_id: string|null}>} */
  const out = {}
  for (const q of Array.isArray(questions) ? questions : []) {
    if (!q || typeof q.id !== 'string') continue
    const sheet = typeof q.sheetId === 'string' ? sheets?.[q.sheetId] : undefined
    if (sheet) {
      if (inScope(sheet.subject_id)) out[q.id] = { subject_id: sheet.subject_id, sheet_id: q.sheetId }
      continue
    }
    if (narrow && inScope(scopeSubjectId)) out[q.id] = { subject_id: /** @type {string} */ (scopeSubjectId), sheet_id: null }
  }
  return out
}
