// Estado del chat del Brote. Puro: sin React, sin window, sin servicios.
// El hook pasa cada evento del servidor por `reduceEvent`.

/**
 * @typedef {Object} Message
 * @property {'user'|'assistant'} role
 * @property {string} text  Texto plano (el modelo no devuelve HTML).
 * @property {number} [turn]  Turno al que pertenece (lo abre cada mensaje del usuario).
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
 * @property {import('./bridge.js').Selection} [selection]  La del atajo que la pidió (verifica un reemplazo).
 * @property {number} [turn]  Turno de la respuesta que la trajo.
 * @property {string} [appliedSheetCreatedAt]  `created_at` de la hoja donde se aplicó (para decir "hoja del dd/mm").
 */

/**
 * @typedef {Object} ChatState
 * @property {Message[]} messages
 * @property {Proposal[]} proposals
 * @property {boolean} busy
 * @property {string|null} status  Texto legible de lo que está haciendo el Brote.
 * @property {Object|null} usage
 * @property {Object[]|null} quiz
 * @property {string|null} error
 * @property {string|null} notice  Nota informativa neutra (p. ej. "es de Premium"); no es un error.
 * @property {number} turn  Turno actual (0 al inicio; cada mensaje del usuario suma uno).
 * @property {Object|null} summary  Resumen estructurado (`SummaryPayload`) de la última respuesta.
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
    messages: [], proposals: [], busy: false, status: null, usage: null, quiz: null, error: null,
    notice: null,
    truncated: false,
    turn: 0,
    summary: null,
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
  const turn = (state.turn ?? 0) + 1
  return {
    ...state,
    turn,
    messages: capMessages([...state.messages, { role: 'user', text: String(text), turn }]),
    busy: true,
    status: null,
    error: null,
    notice: null,
    truncated: false,
  }
}

/** @param {ChatState} state @param {string} delta @returns {ChatState} */
function appendText(state, delta) {
  const messages = state.messages
  const last = messages[messages.length - 1]
  if (last && last.role === 'assistant') {
    const text = (last.text + delta).slice(0, MAX_MESSAGE_CHARS)
    return { ...state, messages: [...messages.slice(0, -1), { role: 'assistant', text, turn: last.turn ?? state.turn }] }
  }
  const msg = { role: 'assistant', text: delta.slice(0, MAX_MESSAGE_CHARS), turn: state.turn }
  return { ...state, messages: capMessages([...messages, msg]) }
}

/** Selección con rango y texto (la agrega el cliente, no viene del servidor). */
function isSelection(sel) {
  return Boolean(sel) && typeof sel.sheetId === 'string' && Number.isInteger(sel.from)
    && Number.isInteger(sel.to) && typeof sel.text === 'string'
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
    turn: state.turn,
  }
  if (typeof raw.sheetId === 'string') proposal.sheetId = raw.sheetId
  if (typeof raw.subjectId === 'string') proposal.subjectId = raw.subjectId
  if (isSelection(raw.selection)) proposal.selection = { ...raw.selection }
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
    case 'summary': {
      const sm = event.summary
      return sm && typeof sm === 'object' && typeof sm.title === 'string' && Array.isArray(sm.sections)
        ? { ...state, summary: sm }
        : state
    }
    case 'quiz':
      return Array.isArray(event.questions) ? { ...state, quiz: event.questions } : state
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
 * @param {{sheetCreatedAt?: string}} [extra]  Al aplicar: `created_at` de la hoja tocada.
 * @returns {ChatState}
 */
export function setProposalStatus(state, id, status, extra) {
  if (!SETTABLE.includes(status)) return state
  const date = status === 'applied' && typeof extra?.sheetCreatedAt === 'string' ? extra.sheetCreatedAt : null
  return {
    ...state,
    proposals: state.proposals.map((p) => {
      if (p.id !== id) return p
      return date ? { ...p, status, appliedSheetCreatedAt: date } : { ...p, status }
    }),
  }
}

/**
 * Items del hilo en orden de lectura: cada propuesta va después del último
 * mensaje de su turno. Las de turnos ya recortados (sin mensajes) van primero.
 * @param {ChatState} state
 * @returns {Array<{type: 'message', message: Message}|{type: 'proposal', proposal: Proposal}>}
 */
export function threadItems(state) {
  const lastIndexOfTurn = new Map()
  state.messages.forEach((m, i) => lastIndexOfTurn.set(m.turn, i))
  const items = []
  for (const proposal of state.proposals) {
    if (!lastIndexOfTurn.has(proposal.turn)) items.push({ type: 'proposal', proposal })
  }
  state.messages.forEach((message, i) => {
    items.push({ type: 'message', message })
    if (lastIndexOfTurn.get(message.turn) === i) {
      for (const proposal of state.proposals) {
        if (proposal.turn === message.turn) items.push({ type: 'proposal', proposal })
      }
    }
  })
  return items
}

/**
 * Suma al chat un intercambio hecho aparte (atajo de selección): cada mensaje
 * del usuario abre un turno nuevo; entran solo las propuestas pendientes, en
 * el último turno del intercambio.
 * @param {ChatState} state
 * @param {{messages: Message[], proposals: Proposal[]}} exchange
 * @returns {ChatState}
 */
export function appendExchange(state, exchange) {
  let turn = state.turn ?? 0
  const added = []
  for (const m of exchange?.messages ?? []) {
    if (m.role === 'user') turn += 1
    added.push({ ...m, turn })
  }
  const known = new Set(state.proposals.map((p) => p.id))
  const pending = (exchange?.proposals ?? [])
    .filter((p) => p.status === 'pending' && !known.has(p.id))
    .map((p) => ({ ...p, turn }))
  return {
    ...state,
    turn,
    messages: capMessages([...state.messages, ...added]),
    proposals: [...state.proposals, ...pending].slice(-MAX_PROPOSALS),
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
 * Nota informativa neutra (no es error: no pone triste al Brote ni se anuncia
 * como alerta). `null` la limpia.
 * @param {ChatState} state @param {string|null} message @returns {ChatState}
 */
export function setNotice(state, message) {
  return { ...state, notice: typeof message === 'string' && message ? message : null }
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
