// Arma las piezas del pedido al Brote desde el panel. Puro: sin React ni services.
// Los topes y las funciones por plan se leen de la config del servidor (un solo
// lugar con números); el servidor sigue siendo la autoridad: esto solo evita
// pedidos que de antemano se sabe que va a rechazar.

import { FEATURES, MAX } from '../../../supabase/functions/assistant/config.js'
import { QUIZ_ACTIONS } from './quizSession.js'
import { getLang, tIn } from '../i18n/index.js'

/**
 * @typedef {'sheet'|'subject'|'career'|'all'} ScopeType
 * @typedef {{value: ScopeType, label: string, locked: boolean}} ScopeOption
 */

/**
 * Etiqueta visible de cada acción lanzada desde un chip.
 * @param {string} action
 * @param {string} [lang]
 * @returns {string}
 */
export function actionLabel(action, lang = getLang()) {
  return tIn(lang, `assistant.actions.${action}`)
}

/** Función de Premium de cada acción (misma tabla que `quota.js`). */
const FEATURE_OF_ACTION = { weak_review: 'weakReview', study_plan: 'studyPlan', connections: 'connections' }

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
 * @param {string} [lang]
 * @returns {ScopeOption[]}
 */
export function scopeOptions(context, plan, lang = getLang()) {
  const wide = !featuresOf(plan).allScope
  /** @type {ScopeOption[]} */
  const out = []
  if (context?.sheetId) out.push({ value: 'sheet', label: tIn(lang, 'assistant.scope.sheet'), locked: false })
  if (context?.subject) out.push({ value: 'subject', label: tIn(lang, 'assistant.scope.subject'), locked: false })
  if (context?.career) out.push({ value: 'career', label: tIn(lang, 'assistant.scope.career'), locked: wide })
  out.push({ value: 'all', label: tIn(lang, 'assistant.scope.all'), locked: wide })
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
 * @param {string} [lang]
 * @returns {string|null}
 */
export function lockedActionMessage(action, plan, lang = getLang()) {
  const feature = FEATURE_OF_ACTION[action]
  if (!feature || featuresOf(plan)[feature]) return null
  return tIn(lang, `assistant.locked.${feature}`)
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
 * El pedido completo al servidor: los campos de la acción, el historial, el modo (la corrección va
 * siempre en `notes`), el alcance y el idioma de la interfaz (`uiLang`: el servidor lo usa para
 * responder en ese idioma cuando no hay un mensaje escrito).
 * @param {{fields: Object, history: Array<{role: string, text: string}>, mode: 'notes'|'external', scope: Object|null, lang?: string}} input
 * @returns {Object}
 */
export function buildRequest({ fields, history, mode, scope, lang = getLang() }) {
  return { message: '', ...fields, history, mode: requestMode(fields.action, mode), scope, uiLang: lang }
}

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
 * Aviso para cada motivo de `blockReason`. `inline`: el que se ve en la tarjeta de un atajo cuando
 * el que está respondiendo es el chat (el motivo `busy` cambia de texto).
 * @param {string} reason
 * @param {{inline?: boolean, lang?: string}} [options]
 * @returns {string|undefined}
 */
export function blockNotice(reason, { inline = false, lang = getLang() } = {}) {
  if (reason === 'busy') return tIn(lang, inline ? 'assistant.notices.inlineBusy' : 'assistant.notices.busy')
  if (reason === 'no_scope') return tIn(lang, 'assistant.notices.noScope')
  if (reason === 'quiz_open') return tIn(lang, 'assistant.notices.quizOpen')
  return undefined
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
