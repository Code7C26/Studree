/**
 * Pedido de transcripción de una foto al Brote (acción `transcribe`).
 * Puro: se testea en Node. El contrato está en `docs/API_DOCS.md`.
 */

import { getLang } from '../i18n/index.js'

/**
 * @param {{subjectId: string, image: {mimeType: string, data: string}, lang?: string}} input
 * @returns {{action: 'transcribe', message: '', history: [], mode: 'notes', scope: {type: 'subject', id: string}, uiLang: 'es'|'en', image: {mimeType: string, data: string}}}
 */
export function buildTranscribeRequest({ subjectId, image, lang = getLang() }) {
  return {
    action: 'transcribe',
    message: '',
    history: [],
    mode: 'notes',
    scope: { type: 'subject', id: subjectId },
    uiLang: lang === 'en' ? 'en' : 'es',
    image: { mimeType: image.mimeType, data: image.data },
  }
}
