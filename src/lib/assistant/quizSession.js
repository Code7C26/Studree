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
 * @property {string} title  Título del examen (se guarda en `quiz_attempts.title`).
 * @property {string|null} careerId  Carrera del examen (para Mi estudio).
 * @property {QuizStatus} status
 * @property {Record<string, number|boolean|string>|null} given  Respuestas enviadas (desde `grading`).
 * @property {Object|null} outcome  Resultado (en `done`).
 */

/** Acciones que arman una prueba nueva (y reemplazarían la abierta). */
export const QUIZ_ACTIONS = Object.freeze(['quiz', 'weak_review'])

/** Por qué no se puede pedir otra prueba (se muestra en los chips deshabilitados). */
export const QUIZ_OPEN_REASON = 'Terminá o descartá la prueba abierta para pedir otra.'

/**
 * ¿Hay una prueba sin terminar? Pedir otra la reemplazaría: se perderían las
 * respuestas y se gastaría una prueba del cupo mensual.
 * @param {QuizSession|null} session
 * @returns {boolean}
 */
export function blocksNewQuiz(session) {
  return session?.status === 'open' || session?.status === 'grading'
}

/**
 * "Descartar prueba": sin red, la saca del panel. Una que se está corrigiendo
 * no se descarta (la corrección y el guardado ya están en curso).
 * @param {QuizSession|null} session
 * @returns {QuizSession|null}
 */
export function discardQuiz(session) {
  if (session?.status === 'grading') return session
  return null
}

/**
 * Sesión nueva para las preguntas que llegaron en el evento `quiz`.
 * @param {QuizSession|null} prev
 * @param {{scope: QuizSession['scope'], scopeSubjectId: string|null, isReview: boolean, title: string, careerId: string|null}} meta
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

/**
 * ¿Se puede reintentar el guardado? Solo una prueba terminada, con preguntas
 * corregidas y sin fila guardada (así reintentar nunca duplica).
 * @param {QuizSession|null} session
 * @returns {boolean}
 */
export function canRetrySave(session) {
  return session?.status === 'done' && !session.outcome?.attemptId && (session.outcome?.score?.total ?? 0) > 0
}

/**
 * Anota el resultado de un (re)intento de guardado. Solo si sigue siendo la
 * misma prueba; con `attemptId` limpia el error de guardado.
 * @param {QuizSession|null} session
 * @param {number} key
 * @param {{attemptId: string|null, error: string|null}} result
 * @returns {QuizSession|null}
 */
export function withSavedAttempt(session, key, { attemptId, error }) {
  if (!session || session.key !== key || session.status !== 'done') return session
  return {
    ...session,
    outcome: { ...session.outcome, attemptId: attemptId ?? null, saveError: attemptId ? null : error },
  }
}
