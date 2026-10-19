/**
 * Mensajes en castellano para los errores del asistente (Edge Function `assistant`).
 * Puro, sin imports de services/supabase: se testea en Node. Ver
 * docs/features/assistant.md (tabla de respuestas antes del stream).
 */

const GENERIC = 'No se pudo hablar con el Brote. Probá de nuevo.'

/**
 * Traduce el status y el cuerpo JSON de una respuesta no-2xx. Nunca muestra
 * cuerpos crudos: solo el campo `message` de los 403 y 429 del servidor.
 * @param {number} status - 0 si no hubo respuesta (red).
 * @param {unknown} body - cuerpo ya parseado (o null si no era JSON).
 * @returns {string}
 */
export function translateAssistantError(status, body) {
  const data = body && typeof body === 'object' ? /** @type {{code?: unknown, message?: unknown}} */ (body) : {}
  if (status === 401) return 'Tu sesión expiró. Volvé a iniciar sesión.'
  if (status === 403 || status === 429) {
    return typeof data.message === 'string' && data.message.trim() ? data.message : GENERIC
  }
  if (status === 400) {
    return data.code === 'not_found' ? 'Esa hoja o materia ya no existe (¿está en la papelera?).' : 'No se pudo procesar el pedido.'
  }
  if (status === 404) return 'El asistente todavía no está disponible (falta desplegar la función).'
  return GENERIC
}
