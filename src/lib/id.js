/**
 * Genera un identificador único corto, suficiente para datos locales.
 * Combina timestamp en base36 con una parte aleatoria.
 * @returns {string}
 */
export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
