/**
 * Mensajes para los errores del asistente (Edge Function `assistant`), en el idioma activo.
 * Puro, sin imports de services/supabase: se testea en Node. Ver
 * docs/features/assistant.md (tabla de respuestas antes del stream).
 */

import { getLang, tIn } from '../i18n/index.js'

/**
 * Traduce el status y el cuerpo JSON de una respuesta no-2xx. Nunca muestra
 * cuerpos crudos. Para los 403 y 429 usa `code` + `reason` (qué función de Premium
 * o qué tope se agotó); si el servidor es viejo (sin `reason`) o manda algo que este
 * cliente no conoce, muestra el `message` del servidor.
 * @param {number} status - 0 si no hubo respuesta (red).
 * @param {unknown} body - cuerpo ya parseado (o null si no era JSON).
 * @param {string} [lang]
 * @returns {string}
 */
export function translateAssistantError(status, body, lang = getLang()) {
  const data = body && typeof body === 'object' ? /** @type {{code?: unknown, reason?: unknown, message?: unknown}} */ (body) : {}
  const text = (key) => tIn(lang, `assistant.errors.${key}`)
  /** @param {string} key @returns {string|null} */
  const known = (key) => {
    const found = tIn(lang, key)
    return found === key ? null : found
  }

  if (status === 401) return tIn(lang, 'errors.supabase.sessionExpired')
  if (status === 403 || status === 429) {
    const group = data.code === 'feature' || data.code === 'quota' ? data.code : status === 403 ? 'feature' : 'quota'
    const translated = typeof data.reason === 'string' ? known(`assistant.errors.${group}.${data.reason}`) : null
    if (translated) return translated
    return typeof data.message === 'string' && data.message.trim() ? data.message : text('generic')
  }
  if (status === 400) return data.code === 'not_found' ? text('notFound') : text('badRequest')
  if (status === 404) return text('undeployed')
  if (status === 503 && data.code === 'config') return text('unconfigured')
  return text('generic')
}
