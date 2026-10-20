// Ciclo de vida de una prueba del Brote. Puro: sin React ni services.
// Una prueba se corrige y se guarda UNA sola vez: `open` → `grading` → `done`.

/**
 * @typedef {'open'|'grading'|'done'} QuizStatus
 */

/**
 * @typedef {Object} QuizSession
 * @property {number} key  Cambia con cada prueba nueva (reinicia el QuizRunner).
 * @property {import('./quizScore.js').Question[]} questions
 * @property {{type: 'sheet'|'subject'|'career'|'all', id?: string}} scope
 * @property {string|null} scopeSubjectId  Materia del alcance hoja/materia.
 * @property {boolean} isReview  `weak_review`: los aciertos borran el tema flojo.
 * @property {QuizStatus} status
 * @property {Record<string, number|boolean|string>|null} given  Respuestas enviadas (desde `grading`).
 * @property {Object|null} outcome  Resultado (en `done`).
 */

/**
 * Sesión nueva para las preguntas que llegaron en el evento `quiz`.
 * @param {QuizSession|null} prev
 * @param {{scope: QuizSession['scope'], scopeSubjectId: string|null, isReview: boolean}} meta
 * @param {import('./quizScore.js').Question[]} questions
 * @returns {QuizSession}
 */
export function createQuizSession(prev, meta, questions) {
  return {
    ...meta,
    key: (prev?.key ?? 0) + 1,
    questions,
    status: 'open',
    given: null,
    outcome: null,
  }
}

/**
 * Pasa a `grading` con las respuestas. Devuelve `null` si la sesión ya se
 * envió (o no existe): un segundo envío se ignora.
 * @param {QuizSession|null} session
 * @param {Record<string, number|boolean|string>} given
 * @returns {QuizSession|null}
 */
export function startSubmit(session, given) {
  if (!session || session.status !== 'open') return null
  return { ...session, status: 'grading', given: { ...(given ?? {}) } }
}

/**
 * Resultado de una corrección que lanzó un error inesperado: la prueba igual
 * termina (`done`) mostrando el error, en vez de quedar trabada en `grading`.
 * Si ya estaba corregida (`partial`), lo que falló fue el guardado.
 * @param {{results: Array<Object>, score: {total: number, correct: number}, gradeError: string|null}|null} partial
 * @param {string} message
 * @returns {{results: Array<Object>, score: {total: number, correct: number}, sheets: Record<string, never>, gradeError: string|null, saveError: string|null, savedTopics: false}}
 */
export function failedOutcome(partial, message) {
  if (!partial) {
    return { results: [], score: { total: 0, correct: 0 }, sheets: {}, gradeError: message, saveError: null, savedTopics: false }
  }
  return {
    results: partial.results,
    score: partial.score,
    sheets: {},
    gradeError: partial.gradeError,
    saveError: message,
    savedTopics: false,
  }
}

/**
 * Guarda el resultado y cierra la sesión (`done`). Solo si sigue siendo la
 * misma prueba (misma `key`) y estaba corrigiéndose; si no, la deja igual.
 * @param {QuizSession|null} session
 * @param {number} key
 * @param {Object|null} outcome  `null` = no se pudo corregir: vuelve a `open`.
 * @returns {QuizSession|null}
 */
export function finishSubmit(session, key, outcome) {
  if (!session || session.key !== key || session.status !== 'grading') return session
  if (!outcome) return { ...session, status: 'open', given: null }
  return { ...session, status: 'done', outcome }
}
