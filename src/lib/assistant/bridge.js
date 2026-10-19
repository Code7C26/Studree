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
 * @returns {{
 *   set: (ctx: AssistantContext|null) => void,
 *   get: () => AssistantContext|null,
 *   subscribe: (fn: (ctx: AssistantContext|null) => void) => () => void
 * }}
 */
export function createBridge() {
  /** @type {AssistantContext|null} */
  let current = null
  const listeners = new Set()
  return {
    set(ctx) {
      current = ctx ?? null
      for (const fn of [...listeners]) {
        // Un suscriptor roto no debe cortar a los demás.
        try { fn(current) } catch { /* ignorado */ }
      }
    },
    get() {
      return current
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
  }
}

/** Instancia única compartida por la carpeta y el panel. */
export const assistantBridge = createBridge()
