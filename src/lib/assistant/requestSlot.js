// Un solo pedido a la vez en todo el Brote: el del chat o el de la tarjeta de
// un atajo. Puro (sin React): `useAssistant` guarda una instancia por motor.
// Ver docs/features/assistant.md.

/** @typedef {'chat'|'inline'} RequestOwner */

/**
 * @returns {{
 *   running: () => boolean,
 *   owner: () => RequestOwner|null,
 *   claim: (owner: RequestOwner) => AbortController,
 *   release: (controller: AbortController) => void,
 *   abort: (owner?: RequestOwner, options?: {free?: boolean}) => boolean,
 * }}
 */
export function createRequestSlot() {
  /** @type {{controller: AbortController, owner: RequestOwner}|null} */
  let current = null
  return {
    running: () => current !== null,
    owner: () => current?.owner ?? null,
    /** Arranca un pedido de `owner` (quien llama ya verificó que no había otro). */
    claim(owner) {
      const controller = new AbortController()
      current = { controller, owner }
      return controller
    },
    /** Al terminar el stream: lo suelta solo si sigue siendo suyo (pudo reemplazarlo otro). */
    release(controller) {
      if (current?.controller === controller) current = null
    },
    /**
     * Corta el pedido en curso si es de `owner` (sin `owner`, cualquiera). Con
     * `free` lo suelta ya, así puede arrancar otro antes de que termine el
     * cortado (sirve cuando sus eventos tardíos se descartan solos, como en la
     * tarjeta); sin `free` lo sigue ocupando hasta su `release`.
     * @returns {boolean} Si cortó algo.
     */
    abort(owner, { free = false } = {}) {
      if (!current || (owner && current.owner !== owner)) return false
      current.controller.abort()
      if (free) current = null
      return true
    },
  }
}
