// Validación del pedido al asistente. Falla CERRADO: ante cualquier dato raro
// devuelve `{ok:false, error}` en vez de corregirlo en silencio. Lo único que
// se "arregla" es el historial largo, que se recorta a los últimos turnos.

import { ACTIONS, MAX } from './config.js'

const SCOPE_TYPES = ['sheet', 'subject', 'career', 'all']
const QUIZ_TYPES = ['mcq', 'tf', 'open']
const ROLES = ['user', 'model']
const NEEDS_MESSAGE = ['chat', 'shortcut']

const fail = (error) => ({ ok: false, error })
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== ''

/**
 * @typedef {Object} AssistantRequest
 * @property {string} action
 * @property {string} message
 * @property {Array<{role: 'user'|'model', text: string}>} history
 * @property {'notes'|'external'} mode
 * @property {{type: 'sheet'|'subject'|'career'|'all', id?: string}} scope
 * @property {{sheetId: string, text: string}} [selection]
 * @property {{count: number, types: Array<'mcq'|'tf'|'open'>}} [quiz]
 * @property {Array<{id: string, question: string, expected: string, given: string}>} [answers]
 */

/**
 * @param {unknown} body
 * @returns {{ok: true, value: AssistantRequest} | {ok: false, error: string}}
 */
export function validateRequest(body) {
  if (!isObject(body)) return fail('El pedido tiene que ser un objeto.')

  const { action } = body
  if (typeof action !== 'string' || !ACTIONS.includes(action)) return fail('Acción inválida.')

  const message = body.message ?? ''
  if (typeof message !== 'string') return fail('El mensaje tiene que ser texto.')
  if (message.length > MAX.message) return fail(`El mensaje supera los ${MAX.message} caracteres.`)
  if (NEEDS_MESSAGE.includes(action) && message.trim() === '') return fail('Falta el mensaje.')

  const mode = body.mode ?? 'notes'
  if (mode !== 'notes' && mode !== 'external') return fail('Modo inválido.')

  const { scope } = body
  if (!isObject(scope) || !SCOPE_TYPES.includes(scope.type)) return fail('Alcance inválido.')
  if (scope.type !== 'all' && !isNonEmptyString(scope.id)) return fail('Falta el id del alcance.')

  const rawHistory = body.history ?? []
  if (!Array.isArray(rawHistory)) return fail('El historial tiene que ser una lista.')
  for (const turn of rawHistory) {
    if (!isObject(turn) || !ROLES.includes(turn.role) || typeof turn.text !== 'string') {
      return fail('Turno de historial inválido.')
    }
  }
  const history = rawHistory.slice(-MAX.history).map((t) => ({ role: t.role, text: t.text }))

  /** @type {AssistantRequest} */
  const value = {
    action,
    message,
    history,
    mode,
    scope: scope.type === 'all' ? { type: 'all' } : { type: scope.type, id: scope.id },
  }

  if (body.selection !== undefined) {
    const sel = body.selection
    if (!isObject(sel) || !isNonEmptyString(sel.sheetId) || typeof sel.text !== 'string') {
      return fail('Selección inválida.')
    }
    if (sel.text.length > MAX.selection) return fail(`La selección supera los ${MAX.selection} caracteres.`)
    value.selection = { sheetId: sel.sheetId, text: sel.text }
  }

  if (body.quiz !== undefined) {
    const quiz = body.quiz
    if (
      !isObject(quiz) ||
      !Number.isInteger(quiz.count) ||
      quiz.count < 1 ||
      quiz.count > MAX.quizQuestions ||
      !Array.isArray(quiz.types) ||
      quiz.types.length === 0 ||
      !quiz.types.every((t) => QUIZ_TYPES.includes(t))
    ) {
      return fail(`Pedido de prueba inválido (1 a ${MAX.quizQuestions} preguntas).`)
    }
    value.quiz = { count: quiz.count, types: [...quiz.types] }
  }

  if (action === 'quiz_grade') {
    const { answers } = body
    if (!Array.isArray(answers) || answers.length < 1 || answers.length > MAX.quizQuestions) {
      return fail(`Hay que mandar entre 1 y ${MAX.quizQuestions} respuestas.`)
    }
    for (const a of answers) {
      if (!isObject(a) || !['id', 'question', 'expected', 'given'].every((k) => typeof a[k] === 'string')) {
        return fail('Respuesta inválida.')
      }
      if (a.question.length > MAX.message || a.expected.length > MAX.message || a.given.length > MAX.message) {
        return fail('Una respuesta supera el largo permitido.')
      }
    }
    value.answers = answers.map((a) => ({ id: a.id, question: a.question, expected: a.expected, given: a.given }))
  }

  return { ok: true, value }
}
