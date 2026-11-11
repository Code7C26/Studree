import { getLang, tIn } from '../i18n/index.js'
// Ayudas puras para aplicar propuestas del Brote. Aplicar siempre lo decide el usuario.

/**
 * Marca el origen cuando lo agregado no sale de los apuntes del usuario.
 * @param {string} markdown
 * @param {'notes'|'external'} source
 * @param {string} [lang]  La marca queda escrita en la hoja, en el idioma de ese momento.
 * @returns {string}
 */
export function withOriginMark(markdown, source, lang = getLang()) {
  return source === 'external' ? `${tIn(lang, 'assistant.proposal.originMark')}\n\n${markdown}` : markdown
}

/**
 * Reemplazar solo es seguro si el texto seleccionado todavía es el que se guardó.
 * Falla cerrado: vacío o distinto => false.
 * @param {string} currentText
 * @param {string} savedText
 * @returns {boolean}
 */
export function canApplyReplace(currentText, savedText) {
  return typeof currentText === 'string' && typeof savedText === 'string'
    && currentText.length > 0 && currentText === savedText
}

/**
 * Título de la tarjeta de una propuesta.
 * @param {import('./chatState.js').Proposal} p
 * @param {string} [lang]
 * @returns {string}
 */
export function proposalTitle(p, lang = getLang()) {
  switch (p?.kind) {
    case 'append': return tIn(lang, 'assistant.proposal.append')
    case 'replace_selection': return tIn(lang, 'assistant.proposal.replace')
    case 'new_sheet': return tIn(lang, 'assistant.proposal.newSheet')
    default: return tIn(lang, 'assistant.proposal.other')
  }
}
