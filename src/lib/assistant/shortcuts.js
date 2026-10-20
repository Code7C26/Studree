// Atajos sobre el texto seleccionado en una hoja (Explicar, Refutar, Completar,
// Preguntame). Puro: arma el pedido `shortcut` que el panel manda al Brote.
// Ver docs/features/assistant.md.

import { MAX } from '../../../supabase/functions/assistant/config.js'

/** @typedef {import('./bridge.js').Selection} Selection */
/** @typedef {'explain'|'refute'|'complete'|'ask'} ShortcutId */

/** Atajos de la barra flotante, en el orden en que se muestran. */
export const SHORTCUTS = Object.freeze([
  { id: 'explain', label: 'Explicar' },
  { id: 'refute', label: 'Refutar' },
  { id: 'complete', label: 'Completar' },
  { id: 'ask', label: 'Preguntame' },
])

/** Lo que se le pide al Brote en cada atajo (antes de citar el texto). */
const INSTRUCTIONS = {
  explain: 'Explicame este fragmento de mis apuntes con otras palabras y algún ejemplo.',
  refute:
    'Revisá este fragmento de mis apuntes: marcá lo que esté flojo, impreciso o mal. Si conviene corregirlo, proponé el texto nuevo con propose_replace_selection (o lo que falte con propose_append).',
  complete:
    'Completá este fragmento de mis apuntes con los conceptos que le falten. Proponé el texto con propose_replace_selection (o con propose_append si va al final de la hoja).',
  ask: 'Tomame una pregunta sobre este fragmento de mis apuntes para ver si lo entendí. Esperá mi respuesta antes de corregirme.',
}

/** Largo del pedacito de texto que se ve en el chat. */
const LABEL_EXCERPT = 80

/**
 * @param {string} id
 * @returns {{id: string, label: string}}
 */
function findShortcut(id) {
  const shortcut = SHORTCUTS.find((s) => s.id === id)
  if (!shortcut) throw new Error(`Atajo desconocido: ${id}`)
  return shortcut
}

/** @param {Selection|null} selection @returns {string} */
function selectedText(selection) {
  const text = typeof selection?.text === 'string' ? selection.text : ''
  if (!selection || typeof selection.sheetId !== 'string' || !selection.sheetId || !text.trim()) {
    throw new Error('El atajo necesita un texto seleccionado.')
  }
  return text
}

/**
 * Pedido `shortcut` para el servidor. El `message` nombra la acción y cita el
 * texto (recortado para no pasar `MAX.message`); el texto completo (hasta
 * `MAX.selection`) va en `selection`.
 * @param {string} id
 * @param {Selection} selection
 * @returns {{action: 'shortcut', message: string, selection: {sheetId: string, text: string}}}
 */
export function buildShortcutRequest(id, selection) {
  findShortcut(id)
  const text = selectedText(selection).slice(0, MAX.selection)
  const head = `${INSTRUCTIONS[id]}\n\nTexto seleccionado:\n«`
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
 * @returns {string}
 */
export function shortcutLabel(id, selection) {
  const { label } = findShortcut(id)
  const flat = selectedText(selection).replace(/\s+/g, ' ').trim()
  const excerpt = flat.length > LABEL_EXCERPT ? `${flat.slice(0, LABEL_EXCERPT - 1)}…` : flat
  return `${label}: «${excerpt}»`
}
