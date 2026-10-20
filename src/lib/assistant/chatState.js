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
 * @property {boolean} truncated  La última respuesta se cortó (`done` con `truncated` o un `finishReason` distinto de STOP).
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
    truncated: false,
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
 * Suma el mensaje del usuario y deja el chat ocupado. También se usa para las
 * acciones lanzadas desde un chip (sin texto escrito): el texto es la etiqueta
 * visible del chip ("Resumir materia"), así el pedido queda a la vista y el
 * chat queda ocupado igual.
 * @param {ChatState} state @param {string} text @returns {ChatState}
 */
export function addUserMessage(state, text) {
  return {
    ...state,
    messages: capMessages([...state.messages, { role: 'user', text: String(text) }]),
    busy: true,
    status: null,
    error: null,
    truncated: false,
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
    case 'done': {
      const reason = event.finishReason
      const truncated = event.truncated === true || (typeof reason === 'string' && reason !== '' && reason !== 'STOP')
      return { ...state, busy: false, status: null, truncated }
    }
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

/**
 * Cierra el pedido cuando `streamAssistant` termina, haya llegado `done` o no
 * (corte del usuario, error de red, stream que terminó sin `done`). Si viene un
 * `error` lo muestra; si no, conserva el que haya puesto el stream.
 * @param {ChatState} state @param {string|null} [error] @returns {ChatState}
 */
export function finishRequest(state, error = null) {
  const next = state.busy || state.status ? { ...state, busy: false, status: null } : state
  return typeof error === 'string' && error ? { ...next, error } : next
}

/**
 * Muestra un aviso en el panel sin tocar el resto (p. ej. "es de Premium",
 * "no se pudo aplicar"). `null` lo limpia.
 * @param {ChatState} state @param {string|null} message @returns {ChatState}
 */
export function setError(state, message) {
  return { ...state, error: typeof message === 'string' && message ? message : null }
}

/**
 * Ánimo del Brote según el chat: triste si hubo error, escribiendo si ya está
 * llegando la respuesta, pensando si todavía no llegó nada. `happy` y
 * `sleeping` son pasajeros y los decide la interfaz.
 * @param {ChatState} state
 * @returns {'idle'|'thinking'|'writing'|'sad'}
 */
export function chatMood(state) {
  if (state.busy) return state.messages.at(-1)?.role === 'assistant' ? 'writing' : 'thinking'
  return state.error ? 'sad' : 'idle'
}
