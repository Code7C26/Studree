/**
 * Token de un link para compartir: 32 caracteres hex (128 bits).
 * Se genera en el cliente y la base lo valida con el mismo patrón.
 */

export const TOKEN_RE = /^[0-9a-f]{32}$/

/**
 * @param {unknown} value
 * @returns {string} el token recortado y en minúsculas ('' si no hay valor).
 */
export function normalizeToken(value) {
  return String(value ?? '').trim().toLowerCase()
}

/**
 * @param {unknown} value
 * @returns {boolean} true si es un token de 32 hex.
 */
export function isValidToken(value) {
  return TOKEN_RE.test(normalizeToken(value))
}

/**
 * Genera un token nuevo. `crypto.randomUUID()` da 122 bits de azar; al quitar los
 * guiones quedan 32 hex.
 * @returns {string}
 */
export function newToken() {
  return globalThis.crypto.randomUUID().replace(/-/g, '')
}
