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
 * @typedef {{ok: true, sheetCreatedAt?: string}|{ok: false, error: string}} ApplyResult
 */

/**
 * @typedef {import('./chatState.js').Proposal} Proposal
 * @typedef {import('./inlineAnswer.js').InlineView} InlineView
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
 * Pedido encolado desde fuera del panel (un atajo sobre el texto): el motor lo
 * toma al montarse o cuando se avisa. Con `target: 'inline'` responde en la
 * tarjeta debajo del texto (sin abrir el panel); si no, por el chat.
 * @typedef {Object} QueuedRequest
 * @property {{action: string, message: string, selection?: {sheetId: string, text: string}}} request
 * @property {string} label  Lo que se ve como mensaje del usuario ("Completar: «…»").
 * @property {Selection|null} selection  Selección completa (con rango) para verificar un reemplazo.
 * @property {'chat'|'inline'} [target]  Dónde se responde (por defecto `'chat'`).
 * @property {import('./shortcuts.js').ShortcutId} [shortcutId]  Atajo que lo pidió (la tarjeta muestra su nombre).
 */

/**
 * Comando de la tarjeta de un atajo al motor del Brote.
 * @typedef {{type: 'close'}|{type: 'accept', proposalId: string}|{type: 'discard'}
 *   |{type: 'continue'}|{type: 'answer', text: string}} InlineCommand
 */

/**
 * Propuesta que se aplica cuando se abra la carpeta de su materia (p. ej. un
 * resumen que se guarda como hoja desde otra página).
 * @typedef {{subjectId: string, proposal: Proposal}} PendingApply
 */

/** @param {Set<Function>} listeners @param {unknown} [value] */
function notify(listeners, value) {
  for (const fn of [...listeners]) {
    // Un suscriptor roto no debe cortar a los demás.
    try { fn(value) } catch { /* ignorado */ }
  }
}

/** @param {Set<Function>} listeners @param {Function} fn @returns {() => void} */
function listen(listeners, fn) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/**
 * @returns {{
 *   set: (ctx: AssistantContext|null) => void,
 *   get: () => AssistantContext|null,
 *   subscribe: (fn: (ctx: AssistantContext|null) => void) => () => void,
 *   request: (item: QueuedRequest) => void,
 *   takeRequest: () => QueuedRequest|null,
 *   clearRequest: () => void,
 *   onRequest: (fn: (item: QueuedRequest|null) => void) => () => void,
 *   setInline: (view: InlineView|null) => void,
 *   getInline: () => InlineView|null,
 *   subscribeInline: (fn: (view: InlineView|null) => void) => () => void,
 *   sendInline: (cmd: InlineCommand) => void,
 *   onInlineCommand: (fn: (cmd: InlineCommand) => void) => () => void,
 *   requestOpen: () => void,
 *   onOpenRequest: (fn: () => void) => () => void,
 *   setPendingApply: (item: PendingApply|null) => void,
 *   takePendingApply: (subjectId: string) => Proposal|null
 * }}
 */
export function createBridge() {
  /** @type {AssistantContext|null} */
  let current = null
  const listeners = new Set()
  /** @type {QueuedRequest|null} */
  let pending = null
  const requestListeners = new Set()
  /** @type {InlineView|null} */
  let inline = null
  const inlineListeners = new Set()
  const commandListeners = new Set()
  const openListeners = new Set()
  /** @type {PendingApply|null} */
  let pendingApply = null
  return {
    set(ctx) {
      current = ctx ?? null
      notify(listeners, current)
    },
    get() {
      return current
    },
    subscribe(fn) {
      return listen(listeners, fn)
    },
    /**
     * Encola un pedido (reemplaza al pendiente) y avisa con el item: el host
     * carga el panel (y lo abre si va al chat) y el motor lo toma.
     */
    request(item) {
      pending = item ?? null
      notify(requestListeners, pending)
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
      return listen(requestListeners, fn)
    },
    /** El motor publica la vista de la tarjeta del atajo (`null` = no hay tarjeta). */
    setInline(view) {
      inline = view ?? null
      notify(inlineListeners, inline)
    },
    getInline() {
      return inline
    },
    subscribeInline(fn) {
      return listen(inlineListeners, fn)
    },
    /** La carpeta (la tarjeta) le manda un comando al motor. */
    sendInline(cmd) {
      notify(commandListeners, cmd)
    },
    onInlineCommand(fn) {
      return listen(commandListeners, fn)
    },
    /** Pide abrir el panel como si el usuario tocara el Brote ("Seguir en el chat"). */
    requestOpen() {
      notify(openListeners)
    },
    onOpenRequest(fn) {
      return listen(openListeners, fn)
    },
    /** Deja una propuesta para la carpeta de su materia (reemplaza a la anterior; `null` la borra). */
    setPendingApply(item) {
      pendingApply = item ?? null
    },
    /** Si la propuesta pendiente es de esa materia, la devuelve y la saca; si no, `null` (y queda). */
    takePendingApply(subjectId) {
      if (!pendingApply || pendingApply.subjectId !== subjectId) return null
      const { proposal } = pendingApply
      pendingApply = null
      return proposal
    },
  }
}

/** Instancia única compartida por la carpeta y el panel. */
export const assistantBridge = createBridge()
