/**
 * Traduce los errores de Supabase Auth a mensajes propios y accionables, en el idioma activo.
 * Nunca devuelve el texto crudo del proveedor (viene en inglés): lo que no reconoce se muestra
 * como un mensaje genérico.
 */

import { getLang, tIn } from '../lib/i18n/index.js'

/**
 * @param {{message?: string}|null} error
 * @param {string} [lang]
 * @returns {string|null}
 */
export function translateAuthError(error, lang = getLang()) {
  if (!error) return null
  const message = error.message ?? ''
  const text = (key) => tIn(lang, `auth.errors.${key}`)

  if (/Invalid login credentials/i.test(message)) return text('invalidCredentials')
  if (/Email not confirmed/i.test(message)) return text('emailNotConfirmed')
  if (/User already registered/i.test(message)) return text('alreadyRegistered')
  if (/Password should be at least|weak password/i.test(message)) return text('passwordShort')
  if (/rate limit|too many/i.test(message)) return text('rateLimit')
  if (/Failed to fetch|NetworkError|fetch failed/i.test(message)) return text('network')
  return text('generic')
}
