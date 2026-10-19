// Ayudas puras para aplicar propuestas del Brote. Aplicar siempre lo decide el usuario.

const ORIGIN_MARK = '> Agregado por el Brote (conocimiento externo)'

/**
 * Marca el origen cuando lo agregado no sale de los apuntes del usuario.
 * @param {string} markdown
 * @param {'notes'|'external'} source
 * @returns {string}
 */
export function withOriginMark(markdown, source) {
  return source === 'external' ? `${ORIGIN_MARK}\n\n${markdown}` : markdown
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
 * @returns {string}
 */
export function proposalTitle(p) {
  switch (p?.kind) {
    case 'append': return 'Agregar al final de la hoja'
    case 'replace_selection': return 'Reemplazar la selección'
    case 'new_sheet': return 'Crear una hoja nueva'
    default: return 'Cambio propuesto'
  }
}
