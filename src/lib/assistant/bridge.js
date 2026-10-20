// Puente entre la carpeta (que sabe del editor) y el panel del Brote.
// Puro: la carpeta publica su contexto y el panel lo lee y se suscribe.

/**
 * @typedef {Object} Selection
 * @property {string} sheetId
 * @property {number} from
 * @property {number} to
 * @property {string} text
 */

/**
 * @typedef {{ok: true}|{ok: false, error: string}} ApplyResult
 */

/**
 * @typedef {import('./chatState.js').Proposal} Proposal
 */

/**
 * @typedef {Object} AssistantContext
 * @property {{id: string, name: string}|null} subject
 * @property {{id: string, name: string}|null} career
 * @property {string|null} sheetId
 * @property {() => Selection|null} getSelection
 * @property {(proposal: Proposal) => ApplyResult} apply
 */

/**
 * Pedido encolado desde fuera del panel (un atajo sobre el texto): el panel lo
 * toma al montarse o cuando se avisa, y lo manda por la misma conversación.
 * @typedef {Object} QueuedRequest
 * @property {{action: string, message: string, selection?: {sheetId: string, text: string}}} request
 * @property {string} label  Lo que se ve como mensaje del usuario.
 * @property {Selection|null} selection  Selección completa (con rango) para verificar un reemplazo.
 */

/** @param {Set<Function>} listeners @param {unknown} [value] */
function notify(listeners, value) {
  for (const fn of [...listeners]) {
    // Un suscriptor roto no debe cortar a los demás.
    try { fn(value) } catch { /* ignorado */ }
  }
}

/**
 * @returns {{
 *   set: (ctx: AssistantContext|null) => void,
 *   get: () => AssistantContext|null,
 *   subscribe: (fn: (ctx: AssistantContext|null) => void) => () => void,
 *   request: (item: QueuedRequest) => void,
 *   peekRequest: () => QueuedRequest|null,
 *   takeRequest: () => QueuedRequest|null,
 *   clearRequest: () => void,
 *   onRequest: (fn: () => void) => () => void
 * }}
 */
export function createBridge() {
  /** @type {AssistantContext|null} */
  let current = null
  const listeners = new Set()
  /** @type {QueuedRequest|null} */
  let pending = null
  const requestListeners = new Set()
  return {
    set(ctx) {
      current = ctx ?? null
      notify(listeners, current)
    },
    get() {
      return current
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    /** Encola un pedido (reemplaza al pendiente) y avisa: el host abre el panel y el panel lo toma. */
    request(item) {
      pending = item ?? null
      notify(requestListeners)
    },
    peekRequest() {
      return pending
    },
    /** Devuelve el pedido pendiente y lo saca (se manda una sola vez). */
    takeRequest() {
      const item = pending
      pending = null
      return item
    },
    /** Descarta el pendiente sin avisar (la carpeta que lo pidió se fue). */
    clearRequest() {
      pending = null
    },
    onRequest(fn) {
      requestListeners.add(fn)
      return () => { requestListeners.delete(fn) }
    },
  }
}

/** Instancia única compartida por la carpeta y el panel. */
export const assistantBridge = createBridge()
