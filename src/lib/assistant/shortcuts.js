// Atajos sobre el texto seleccionado en una hoja (Explicar, Refutar, Completar,
// Preguntame). Puro: arma el pedido `shortcut` que el panel manda al Brote.
// Ver docs/features/assistant.md.

import { MAX } from '../../../supabase/functions/assistant/config.js'
import { getLang, tIn } from '../i18n/index.js'

/** @typedef {import('./bridge.js').Selection} Selection */
/** @typedef {'explain'|'refute'|'complete'|'ask'} ShortcutId */

/** Atajos de la barra flotante, en el orden en que se muestran. */
export const SHORTCUTS = Object.freeze([{ id: 'explain' }, { id: 'refute' }, { id: 'complete' }, { id: 'ask' }])

/**
 * Nombre visible de un atajo en el idioma pedido.
 * @param {string} id
 * @param {string} [lang]
 * @returns {string}
 */
export function shortcutName(id, lang = getLang()) {
  return tIn(lang, `assistant.shortcuts.label.${id}`)
}

/** Largo del pedacito de texto que se ve en el chat. */
const LABEL_EXCERPT = 80

/**
 * @param {string} id
 * @returns {{id: string, label: string}}
 */
function findShortcut(id) {
  const shortcut = SHORTCUTS.find((s) => s.id === id)
  if (!shortcut) throw new Error(`Atajo desconocido: ${id}`) // i18n-ignore: error de programación
  return shortcut
}

/** @param {Selection|null} selection @returns {string} */
function selectedText(selection) {
  const text = typeof selection?.text === 'string' ? selection.text : ''
  if (!selection || typeof selection.sheetId !== 'string' || !selection.sheetId || !text.trim()) {
    throw new Error('El atajo necesita un texto seleccionado.') // i18n-ignore: error de programación
  }
  return text
}

/**
 * Pedido `shortcut` para el servidor. El `message` nombra la acción y cita el
 * texto (recortado para no pasar `MAX.message`); el texto completo (hasta
 * `MAX.selection`) va en `selection`.
 * @param {string} id
 * @param {Selection} selection
 * @param {string} [lang]
 * @returns {{action: 'shortcut', message: string, selection: {sheetId: string, text: string}}}
 */
export function buildShortcutRequest(id, selection, lang = getLang()) {
  findShortcut(id)
  const text = selectedText(selection).slice(0, MAX.selection)
  const head = `${tIn(lang, `assistant.shortcuts.instruction.${id}`)}\n\n${tIn(lang, 'assistant.shortcuts.selectedText')}\n«`
  const room = MAX.message - head.length - 2
  const quoted = text.length > room ? `${text.slice(0, room - 1)}…` : text
  return {
    action: 'shortcut',
    message: `${head}${quoted}»`,
    selection: { sheetId: selection.sheetId, text },
  }
}

/**
 * Lo que se muestra como mensaje del usuario en el chat ("Explicar: «…»").
 * @param {string} id
 * @param {Selection} selection
 * @param {string} [lang]
 * @returns {string}
 */
export function shortcutLabel(id, selection, lang = getLang()) {
  findShortcut(id)
  const label = shortcutName(id, lang)
  const flat = selectedText(selection).replace(/\s+/g, ' ').trim()
  const excerpt = flat.length > LABEL_EXCERPT ? `${flat.slice(0, LABEL_EXCERPT - 1)}…` : flat
  return `${label}: «${excerpt}»`
}
