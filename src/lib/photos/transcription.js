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

/**
 * Hojas donde se puede agregar una transcripción ("Guardar en", Fase 16): solo las ya
 * guardadas (las locales todavía no existen en la base), la más nueva primero.
 * @param {{id: string, created_at: string}[]} sheets
 * @param {(sheet: {id: string}) => boolean} isLocal
 * @param {(iso: string) => string} label  Formato de la fecha (ej. `formatSheetDate`).
 * @returns {{id: string, label: string}[]}
 */
export function photoTargets(sheets, isLocal, label) {
  return sheets
    .filter((sheet) => !isLocal(sheet))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
    .map((sheet) => ({ id: sheet.id, label: label(sheet.created_at) }))
}
