// Conversación "inline" del Brote: la tarjeta que responde un atajo debajo del
// texto seleccionado. Puro: el motor (`useAssistant`) pasa cada evento por
// `reduceInline` y publica `inlineView` en el puente. Ver docs/features/assistant.md.

import { addUserMessage, initialChat, reduceEvent } from './chatState.js'
import { buildHistory } from './requestBuilder.js'
import { SHORTCUTS } from './shortcuts.js'

/**
 * @typedef {import('./chatState.js').ChatState} ChatState
 * @typedef {import('./chatState.js').Message} Message
 * @typedef {import('./chatState.js').Proposal} Proposal
 * @typedef {import('./bridge.js').QueuedRequest} QueuedRequest
 * @typedef {import('./bridge.js').Selection} Selection
 * @typedef {import('./shortcuts.js').ShortcutId} ShortcutId
 */

/**
 * Estado de la tarjeta. `chat` es un `ChatState` propio (no el del panel): su
 * primer mensaje es la etiqueta del atajo ("Completar: «…»").
 * @typedef {Object} InlineState
 * @property {number} id  Identifica la tarjeta: los eventos de otra se ignoran.
 * @property {ShortcutId|null} shortcutId
 * @property {string} label  Etiqueta del pedido ("Completar: «…»"), la que pasa al chat.
 * @property {Selection|null} selection
 * @property {string} requestMessage  Pedido completo que se mandó (primer turno del historial).
 * @property {{type: string, id?: string}|null} scope  Alcance con que se pidió (la respuesta del Preguntame usa el mismo).
 * @property {boolean} external  Se pidió con conocimiento externo.
 * @property {boolean} answered  En Preguntame, el usuario ya respondió.
 * @property {ChatState} chat
 */

/**
 * Vista de la tarjeta que se publica en el puente.
 * @typedef {Object} InlineView
 * @property {number} id
 * @property {string} label  Nombre del atajo ("Completar").
 * @property {Message[]} replies  Mensajes sin el pedido.
 * @property {boolean} busy
 * @property {string|null} status
 * @property {string|null} error
 * @property {string|null} notice
 * @property {Proposal|null} proposal  La última propuesta pendiente.
 * @property {boolean} external
 * @property {boolean} canAnswer  Preguntame con la pregunta ya llegada y sin responder.
 */

/**
 * El atajo del pedido: el que trae el item o, si no, el que nombra la etiqueta.
 * @param {QueuedRequest} item @returns {ShortcutId|null}
 */
function shortcutOf(item) {
  if (SHORTCUTS.some((s) => s.id === item?.shortcutId)) return /** @type {ShortcutId} */ (item.shortcutId)
  const label = typeof item?.label === 'string' ? item.label : ''
  const found = SHORTCUTS.find((s) => label.startsWith(`${s.label}:`))
  return found ? /** @type {ShortcutId} */ (found.id) : null
}

/**
 * Tarjeta nueva para un atajo: ocupada y con la etiqueta como mensaje del usuario.
 * @param {number} id
 * @param {QueuedRequest} item
 * @param {{mode: 'notes'|'external', scope: {type: string, id?: string}|null}} options
 * @returns {InlineState}
 */
export function createInline(id, item, { mode, scope }) {
  return {
    id,
    shortcutId: shortcutOf(item),
    label: String(item?.label ?? ''),
    selection: item?.selection ?? null,
    requestMessage: String(item?.request?.message ?? ''),
    scope: scope ?? null,
    external: mode === 'external',
    answered: false,
    chat: addUserMessage(initialChat(), String(item?.label ?? '')),
  }
}

/**
 * Pasa un evento del stream a la tarjeta `id`. Si la tarjeta actual es otra (o
 * ya se cerró), la devuelve igual: un pedido cortado no se mezcla con el nuevo.
 * @param {InlineState|null} inline @param {number} id @param {Object|null} event
 * @returns {InlineState|null}
 */
export function reduceInline(inline, id, event) {
  if (inline?.id !== id) return inline
  const chat = reduceEvent(inline.chat, event)
  return chat === inline.chat ? inline : { ...inline, chat }
}

/**
 * La respuesta del usuario en Preguntame: se suma como mensaje y la tarjeta
 * queda ocupada hasta que llegue la corrección.
 * @param {InlineState} inline @param {string} text @returns {InlineState}
 */
export function addInlineAnswer(inline, text) {
  return { ...inline, answered: true, chat: addUserMessage(inline.chat, text) }
}

/**
 * Historial de la tarjeta para el servidor: el pedido completo (no la
 * etiqueta) y después lo que se habló en ella.
 * @param {InlineState} inline @returns {Array<{role: 'user'|'model', text: string}>}
 */
export function inlineHistory(inline) {
  return buildHistory([{ role: 'user', text: inline.requestMessage }, ...inline.chat.messages.slice(1)])
}

/** @param {InlineState|null} inline @returns {Proposal|null} */
export function pendingProposal(inline) {
  const proposals = inline?.chat.proposals ?? []
  for (let i = proposals.length - 1; i >= 0; i--) {
    if (proposals[i].status === 'pending') return proposals[i]
  }
  return null
}

/**
 * Lo que dibuja la tarjeta.
 * @param {InlineState|null} inline @returns {InlineView|null}
 */
export function inlineView(inline) {
  if (!inline) return null
  const { chat } = inline
  const replies = chat.messages.slice(1)
  return {
    id: inline.id,
    label: SHORTCUTS.find((s) => s.id === inline.shortcutId)?.label ?? 'Brote',
    replies,
    busy: chat.busy,
    status: chat.status,
    error: chat.error,
    notice: chat.notice,
    proposal: pendingProposal(inline),
    external: inline.external,
    canAnswer: inline.shortcutId === 'ask' && !inline.answered && !chat.busy && replies.length > 0,
  }
}
