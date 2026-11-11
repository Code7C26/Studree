// Corrección de las pruebas tipo examen en el cliente. Puro: sin React ni services.
//
// Las preguntas cerradas (opción múltiple y verdadero/falso) se corrigen acá,
// sin gastar uso; las de desarrollo las corrige el servidor (`quiz_grade`).

import { MAX } from '../../../supabase/functions/assistant/config.js'

/**
 * @typedef {Object} Question  Forma que emite el servidor tras `validateQuiz`.
 * @property {string} id
 * @property {'mcq'|'tf'|'open'} type
 * @property {string} prompt
 * @property {string[]} [options]
 * @property {number|boolean|string} answer
 * @property {string} explanation
 * @property {string} topic
 * @property {string} [sheetId]
 */

/**
 * @typedef {Object} QuizResult
 * @property {string} id
 * @property {boolean|null} correct  `null` = abierta sin corregir.
 * @property {string} [feedback]  Devolución del servidor (solo abiertas).
 */

const TYPES = ['mcq', 'tf', 'open']
const isQuestion = (q) => Boolean(q) && typeof q.id === 'string' && TYPES.includes(q.type)
const textOf = (v) => (typeof v === 'string' ? v.trim() : '')

/**
 * Corrige las cerradas. Sin responder = incorrecta. Las abiertas quedan en
 * `null` (las corrige el servidor). No convierte tipos: `'1'` no es `1`.
 * @param {Question[]} questions
 * @param {Record<string, number|boolean|string>} given
 * @returns {Array<{id: string, correct: boolean|null}>}
 */
export function gradeClosed(questions, given) {
  const answers = given ?? {}
  return (Array.isArray(questions) ? questions : []).filter(isQuestion).map((q) => {
    if (q.type === 'open') return { id: q.id, correct: null }
    return { id: q.id, correct: answers[q.id] === q.answer }
  })
}

/**
 * Puntaje de la prueba. Solo cuenta lo corregido (`true`/`false`): una abierta
 * que no se pudo corregir no suma al total. `correct` nunca supera `total`
 * (la base no tiene ese CHECK).
 * @param {Array<{id: string, correct: boolean|null}>} results
 * @returns {{total: number, correct: number}}
 */
export function summarize(results) {
  const graded = (Array.isArray(results) ? results : []).filter((r) => typeof r?.correct === 'boolean')
  const total = graded.length
  const correct = graded.filter((r) => r.correct).length
  return { total, correct: Math.min(correct, total) }
}

/**
 * Pedido de corrección (`answers` de `quiz_grade`): solo abiertas respondidas,
 * cada texto recortado a `MAX.message` (el servidor rechaza los más largos).
 * @param {Question[]} questions
 * @param {Record<string, number|boolean|string>} given
 * @returns {Array<{id: string, question: string, expected: string, given: string}>}
 */
export function openAnswers(questions, given) {
  const answers = given ?? {}
  return (Array.isArray(questions) ? questions : [])
    .filter((q) => isQuestion(q) && q.type === 'open' && textOf(answers[q.id]))
    .map((q) => ({
      id: q.id,
      question: String(q.prompt ?? '').slice(0, MAX.message),
      expected: String(q.answer ?? '').slice(0, MAX.message),
      given: textOf(answers[q.id]).slice(0, MAX.message),
    }))
}

/**
 * Junta la corrección local con las notas del servidor. Una abierta sin
 * responder es incorrecta (no se manda a corregir); una respondida sin nota
 * válida queda en `null` (p. ej. se agotó el tope de correcciones).
 * @param {Question[]} questions
 * @param {Record<string, number|boolean|string>} given
 * @param {Array<{id: string, correct: boolean|null}>} closed  Lo de `gradeClosed`.
 * @param {Array<{id: string, correct: boolean, feedback?: string}>|null} grades
 * @returns {QuizResult[]}
 */
export function mergeResults(questions, given, closed, grades) {
  const answers = given ?? {}
  const byId = new Map()
  for (const g of Array.isArray(grades) ? grades : []) {
    if (g && typeof g.id === 'string' && typeof g.correct === 'boolean') byId.set(g.id, g)
  }
  const types = new Map((Array.isArray(questions) ? questions : []).filter(isQuestion).map((q) => [q.id, q.type]))
  return (closed ?? []).map((r) => {
    if (types.get(r.id) !== 'open') return { id: r.id, correct: r.correct }
    if (!textOf(answers[r.id])) return { id: r.id, correct: false }
    const grade = byId.get(r.id)
    if (!grade) return { id: r.id, correct: null }
    return typeof grade.feedback === 'string' && grade.feedback
      ? { id: r.id, correct: grade.correct, feedback: grade.feedback }
      : { id: r.id, correct: grade.correct }
  })
}
