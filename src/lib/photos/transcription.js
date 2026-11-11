/**
 * Acumulador puro de los eventos SSE de una transcripción. La UI solo necesita
 * el texto y el código de error; el resto de eventos (usage, done) se ignora.
 */

import { tIn } from '../i18n/index.js'

/**
 * @returns {{text: string, error: string|null}}
 */
export function createTranscriptionState() {
  return { text: '', error: null }
}

/**
 * Aplica un evento SSE al estado (mutándolo) y lo devuelve.
 * @param {{text: string, error: string|null}} state
 * @param {{type?: string, delta?: string, code?: string, message?: string}} event
 * @returns {{text: string, error: string|null}}
 */
export function applyTranscriptionEvent(state, event) {
  if (event?.type === 'text' && typeof event.delta === 'string') state.text += event.delta
  if (event?.type === 'error' && !state.error) state.error = event.code ?? 'server'
  return state
}

/**
 * Mensaje visible para el error de la transcripción.
 * @param {string|null} code
 * @param {string} [lang]
 * @returns {string}
 */
export function transcriptionError(code, lang) {
  const key = `camera.errors.${code ?? 'generic'}`
  const text = tIn(lang, key)
  return text === key ? tIn(lang, 'camera.errors.generic') : text
}
