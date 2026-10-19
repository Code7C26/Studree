// Estado del chat del Brote. Puro: sin React, sin window, sin servicios.
// El hook pasa cada evento del servidor por `reduceEvent`.

/**
 * @typedef {Object} Message
 * @property {'user'|'assistant'} role
 * @property {string} text  Texto plano (el modelo no devuelve HTML).
 */

/**
 * @typedef {Object} Proposal
 * @property {string} id
 * @property {'append'|'replace_selection'|'new_sheet'} kind
 * @property {string} [sheetId]
 * @property {string} [subjectId]
 * @property {string} markdown
 * @property {'notes'|'external'} source
 * @property {'pending'|'applied'|'rejected'|'failed'} status
 */

/**
 * @typedef {Object} ChatState
 * @property {Message[]} messages
 * @property {Proposal[]} proposals
 * @property {boolean} busy
 * @property {string|null} status  Texto legible de lo que está haciendo el Brote.
 * @property {Object|null} usage
 * @property {Object[]|null} quiz
 * @property {Object[]|null} grades
 * @property {string|null} error
 */

/** Cuántos mensajes se guardan como máximo (los más nuevos). */
export const MAX_MESSAGES = 50
/** Tope de un mensaje del asistente; coincide con el del servidor. */
export const MAX_MESSAGE_CHARS = 60_000

const MAX_PROPOSALS = 50
const KINDS = ['append', 'replace_selection', 'new_sheet']
const SOURCES = ['notes', 'external']
const SETTABLE = ['applied', 'rejected', 'failed']

const GENERIC_ERROR = 'No se pudo hablar con el Brote. Probá de nuevo.'

/** @returns {ChatState} */
export function initialChat() {
  return {
    messages: [], proposals: [], busy: false, status: null, usage: null, quiz: null, grades: null, error: null,
  }
}

/** @param {Message[]} messages @returns {Message[]} */
function capMessages(messages) {
  return messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages
}

/** Texto legible para la herramienta que está usando el modelo. */
function toolStatus(name) {
  if (name === 'read_sheet' || name === 'list_subject_topics' || name === 'search_notes') return 'Leyendo tus hojas…'
  if (name === 'get_agenda') return 'Mirando tu agenda…'
  if (typeof name === 'string' && name.startsWith('propose_')) return 'Preparando una propuesta…'
  return 'Pensando…'
}

/**
 * Suma el mensaje del usuario y deja el chat ocupado.
 * @param {ChatState} state @param {string} text @returns {ChatState}
 */
export function addUserMessage(state, text) {
  return {
    ...state,
    messages: capMessages([...state.messages, { role: 'user', text: String(text) }]),
    busy: true,
    status: null,
    error: null,
  }
}

/** @param {ChatState} state @param {string} delta @returns {ChatState} */
function appendText(state, delta) {
  const messages = state.messages
  const last = messages[messages.length - 1]
  if (last && last.role === 'assistant') {
    const text = (last.text + delta).slice(0, MAX_MESSAGE_CHARS)
    return { ...state, messages: [...messages.slice(0, -1), { role: 'assistant', text }] }
  }
  const msg = { role: 'assistant', text: delta.slice(0, MAX_MESSAGE_CHARS) }
  return { ...state, messages: capMessages([...messages, msg]) }
}

/** Una propuesta siempre entra pendiente: nunca se aplica sola. */
function addProposal(state, raw) {
  if (!raw || typeof raw.id !== 'string' || typeof raw.markdown !== 'string') return state
  if (!KINDS.includes(raw.kind) || !SOURCES.includes(raw.source)) return state
  if (state.proposals.some((p) => p.id === raw.id)) return state
  /** @type {Proposal} */
  const proposal = {
    id: raw.id,
    kind: raw.kind,
    markdown: raw.markdown,
    source: raw.source,
    status: 'pending',
  }
  if (typeof raw.sheetId === 'string') proposal.sheetId = raw.sheetId
  if (typeof raw.subjectId === 'string') proposal.subjectId = raw.subjectId
  return { ...state, proposals: [...state.proposals, proposal].slice(-MAX_PROPOSALS) }
}

/**
 * Aplica un evento del stream al estado.
 * @param {ChatState} state @param {{type?: string}|null} event @returns {ChatState}
 */
export function reduceEvent(state, event) {
  if (!event || typeof event !== 'object') return state
  switch (event.type) {
    case 'text':
      return typeof event.delta === 'string' && event.delta ? appendText(state, event.delta) : state
    case 'tool':
      return { ...state, status: toolStatus(event.name) }
    case 'proposal':
      return addProposal(state, event.proposal)
    case 'quiz':
      return Array.isArray(event.questions) ? { ...state, quiz: event.questions } : state
    case 'grades':
      return Array.isArray(event.grades) ? { ...state, grades: event.grades } : state
    case 'usage': {
      // Puede llegar después de un `error` (caso `steps`): no toca busy ni error.
      const usage = { ...event }
      delete usage.type
      return { ...state, usage }
    }
    case 'error':
      return {
        ...state,
        busy: false,
        status: null,
        error: typeof event.message === 'string' && event.message ? event.message : GENERIC_ERROR,
      }
    case 'done':
      return { ...state, busy: false, status: null }
    default:
      return state
  }
}

/**
 * Cambia el estado de una sola propuesta.
 * @param {ChatState} state @param {string} id @param {'applied'|'rejected'|'failed'} status
 * @returns {ChatState}
 */
export function setProposalStatus(state, id, status) {
  if (!SETTABLE.includes(status)) return state
  return {
    ...state,
    proposals: state.proposals.map((p) => (p.id === id ? { ...p, status } : p)),
  }
}
