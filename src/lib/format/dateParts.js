/**
 * Piezas de fecha que cambian de forma con el idioma (Fase 18). Funciones puras, hora LOCAL.
 * Castellano: `14/10`, `18:30`. Inglés: `10/14`, `6:30 PM`. Los nombres de días y meses salen
 * del diccionario `dates` (no de `Intl`, para que el resultado no dependa del ICU de cada equipo).
 */

/** @param {number} value */
export const pad = (value) => String(value).padStart(2, '0')

/**
 * @param {Date} date
 * @param {string} lang
 * @returns {string} `18:30` (es) o `6:30 PM` (en).
 */
export function formatTime(date, lang) {
  if (lang !== 'en') return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const hours = date.getHours()
  return `${hours % 12 === 0 ? 12 : hours % 12}:${pad(date.getMinutes())} ${hours < 12 ? 'AM' : 'PM'}`
}

/**
 * @param {Date} date
 * @param {string} lang
 * @param {boolean} [withYear]
 * @returns {string} `14/10`, `14/10/2025` (es) o `10/14`, `10/14/2025` (en).
 */
export function formatNumericDate(date, lang, withYear = false) {
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const base = lang === 'en' ? `${month}/${day}` : `${day}/${month}`
  return withYear ? `${base}/${date.getFullYear()}` : base
}
