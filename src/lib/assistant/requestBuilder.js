// Arma las piezas del pedido al Brote desde el panel. Puro: sin React ni services.
// Los topes y las funciones por plan se leen de la config del servidor (un solo
// lugar con números); el servidor sigue siendo la autoridad: esto solo evita
// pedidos que de antemano se sabe que va a rechazar.

import { FEATURES, MAX } from '../../../supabase/functions/assistant/config.js'
import { QUIZ_ACTIONS } from './quizSession.js'

/**
 * @typedef {'sheet'|'subject'|'career'|'all'} ScopeType
 * @typedef {{value: ScopeType, label: string, locked: boolean}} ScopeOption
 */

/** Etiqueta visible de cada acción lanzada desde un chip. */
export const ACTION_LABELS = Object.freeze({
  summary: 'Resumir materia',
  quiz: 'Tomame examen',
  weak_review: 'Repaso de errores',
  study_plan: 'Plan de estudio',
  gaps: 'Detectar huecos',
  connections: 'Conexiones entre materias',
})

/** Función de Premium de cada acción (misma tabla que `quota.js`). */
const FEATURE_OF_ACTION = { weak_review: 'weakReview', study_plan: 'studyPlan', connections: 'connections' }

/** Mismo texto que el servidor (`quota.js`, FEATURE_MESSAGES). */
const LOCKED_MESSAGES = {
  weakReview: 'El repaso de temas flojos es parte de Premium.',
  studyPlan: 'El plan de estudio es parte de Premium.',
  connections: 'Las conexiones entre temas son parte de Premium.',
}

/** Orden de preferencia del alcance cuando el elegido no está disponible. */
const SCOPE_PREFERENCE = ['subject', 'sheet', 'career', 'all']

/** @param {string} plan */
const featuresOf = (plan) => FEATURES[plan] ?? FEATURES.free

/**
 * Historial para el servidor: los mensajes previos con rol `user`/`model`, los
 * últimos `MAX.history`, cada uno recortado a `MAX.message` (el servidor rechaza
 * turnos más largos) y sin textos vacíos.
 * @param {Array<{role: 'user'|'assistant', text: string}>} messages
 * @returns {Array<{role: 'user'|'model', text: string}>}
 */
export function buildHistory(messages) {
  return (messages ?? [])
    .filter((m) => m && typeof m.text === 'string' && m.text.trim() !== '')
    .slice(-MAX.history)
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text.slice(0, MAX.message) }))
}

/**
 * Alcances que se pueden elegir con el contexto actual. Los que el plan no
 * permite vienen con `locked: true` (se muestran como Premium).
 * @param {import('./bridge.js').AssistantContext|null} context
 * @param {'free'|'premium'} plan
 * @returns {ScopeOption[]}
 */
export function scopeOptions(context, plan) {
  const wide = !featuresOf(plan).allScope
  /** @type {ScopeOption[]} */
  const out = []
  if (context?.sheetId) out.push({ value: 'sheet', label: 'Esta hoja', locked: false })
  if (context?.subject) out.push({ value: 'subject', label: 'Esta materia', locked: false })
  if (context?.career) out.push({ value: 'career', label: 'La carrera', locked: wide })
  out.push({ value: 'all', label: 'Todas mis materias', locked: wide })
  return out
}

/**
 * Alcance efectivo: el elegido si está disponible y no bloqueado; si no, el
 * primero que se pueda usar. `null` si no hay ninguno (free sin materia abierta).
 * @param {ScopeType|null} chosen
 * @param {ScopeOption[]} options
 * @returns {ScopeType|null}
 */
export function resolveScopeType(chosen, options) {
  const usable = options.filter((o) => !o.locked).map((o) => o.value)
  if (chosen && usable.includes(chosen)) return chosen
  return SCOPE_PREFERENCE.find((v) => usable.includes(v)) ?? null
}

/**
 * El `scope` del pedido, con el id que corresponde según el contexto.
 * @param {ScopeType|null} type
 * @param {import('./bridge.js').AssistantContext|null} context
 * @returns {{type: ScopeType, id?: string}|null}
 */
export function buildScope(type, context) {
  if (type === 'all') return { type: 'all' }
  const id =
    type === 'sheet' ? context?.sheetId : type === 'subject' ? context?.subject?.id : type === 'career' ? context?.career?.id : null
  return typeof id === 'string' && id ? { type, id } : null
}

/**
 * Si la acción es de Premium y el plan no la tiene, el aviso a mostrar; si no, `null`.
 * @param {string} action
 * @param {'free'|'premium'} plan
 * @returns {string|null}
 */
export function lockedActionMessage(action, plan) {
  const feature = FEATURE_OF_ACTION[action]
  if (!feature || featuresOf(plan)[feature]) return null
  return LOCKED_MESSAGES[feature] ?? 'Es parte de Premium.'
}

/**
 * Alcance fijo de las acciones que no usan el del panel: los huecos se buscan
 * en la materia abierta; las conexiones, en la carrera (o en todo, si no hay
 * carrera abierta).
 * @param {string} action
 * @param {import('./bridge.js').AssistantContext|null} context
 * @returns {{type: ScopeType, id?: string}|null|undefined}  `undefined` = usar
 *   el alcance del panel; `null` = la acción necesita una materia abierta.
 */
export function actionScope(action, context) {
  if (action === 'gaps') return buildScope('subject', context)
  if (action === 'connections') return buildScope('career', context) ?? { type: 'all' }
  return undefined
}

/** Largo máximo del mensaje que acepta el servidor. */
export const MAX_MESSAGE = MAX.message

/**
 * Modo del pedido. Ruling R: la corrección (`quiz_grade`) va SIEMPRE en modo
 * `notes`, así nunca consume el cupo de conocimiento externo.
 * @param {string} action
 * @param {'notes'|'external'} mode
 * @returns {'notes'|'external'}
 */
export function requestMode(action, mode) {
  return action === 'quiz_grade' ? 'notes' : mode
}

/**
 * Por qué no se puede mandar un pedido ahora (o `null` si se puede):
 * `busy` = el Brote está respondiendo; `no_scope` = no hay alcance (free sin
 * materia abierta); `quiz_open` = pedir otra prueba descartaría la abierta.
 * @param {{running: boolean, scopeValue: Object|null, action: string, quizOpen: boolean}} input
 * @returns {'busy'|'no_scope'|'quiz_open'|null}
 */
export function blockReason({ running, scopeValue, action, quizOpen }) {
  if (running) return 'busy'
  if (!scopeValue) return 'no_scope'
  if (quizOpen && QUIZ_ACTIONS.includes(action)) return 'quiz_open'
  return null
}
