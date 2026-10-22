// Registro de un examen terminado (`quiz_attempts.detail`). Puro.

/**
 * @typedef {Object} RecordQuestion
 * @property {string} id
 * @property {'mcq'|'tf'|'open'} type
 * @property {string} prompt
 * @property {string[]} [options]
 * @property {number|boolean|string|null} given
 * @property {number|boolean|string} answer
 * @property {boolean|null} correct
 * @property {string} explanation
 * @property {string} [feedback]
 * @property {string} topic
 * @property {string} [sheetId]
 * @property {string} [subjectId]
 * @property {string} [sheetDate]  `created_at` ISO de la hoja.
 */

/**
 * @typedef {{version: 1, questions: RecordQuestion[]}} QuizDetail
 */

/**
 * Texto legible de una respuesta (dada o correcta).
 * @param {{type: string, options?: string[]}} question
 * @param {number|boolean|string|null|undefined} value
 * @returns {string}
 */
export function answerText(question, value) {
  if (value === undefined || value === null || value === '') return 'Sin responder'
  if (question.type === 'mcq') return question.options?.[/** @type {number} */ (value)] ?? 'Sin responder'
  if (question.type === 'tf') return value === true ? 'Verdadero' : 'Falso'
  return String(value)
}

/**
 * @param {{isReview: boolean, scopeType: 'sheet'|'subject'|'career'|'all', subjectName: string|null}} args
 * @returns {string}
 */
export function quizTitle({ isReview, scopeType, subjectName }) {
  const prefix = isReview ? 'Repaso de errores' : 'Examen'
  if (subjectName) return `${prefix} · ${subjectName}`
  return `${prefix} · ${scopeType === 'career' ? 'Toda la carrera' : 'Todas mis materias'}`
}

/**
 * @param {{questions: Array<any>, given: Record<string, any>|null}} session
 * @param {{results: Array<{id: string, correct: boolean|null, feedback?: string}>, sheets: Record<string, {subject_id: string, created_at: string}>}} outcome
 * @returns {QuizDetail}
 */
export function buildQuizRecord(session, outcome) {
  const results = outcome?.results ?? []
  const sheets = outcome?.sheets ?? {}
  const given = session.given ?? {}
  return {
    version: 1,
    questions: session.questions.map((q) => {
      const result = results.find((r) => r.id === q.id)
      const sheet = q.sheetId ? sheets[q.sheetId] : undefined
      /** @type {RecordQuestion} */
      const rec = {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        ...(q.options ? { options: q.options } : {}),
        given: given[q.id] ?? null,
        answer: q.answer,
        correct: result?.correct ?? null,
        explanation: q.explanation,
        ...(result?.feedback ? { feedback: result.feedback } : {}),
        topic: q.topic,
        ...(q.sheetId ? { sheetId: q.sheetId } : {}),
        ...(sheet ? { subjectId: sheet.subject_id, sheetDate: sheet.created_at } : {}),
      }
      return rec
    }),
  }
}
