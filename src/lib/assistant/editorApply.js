// Aplica una propuesta aceptada del Brote en el editor TipTap de una hoja.
// Entra por los comandos del editor (la extensión Markdown de tiptap-markdown
// parsea el Markdown en `insertContentAt`): el cambio dispara `onUpdate` →
// Markdown → autosave, igual que si lo hubiera escrito el usuario. Nunca toca
// el service. Sin imports de TipTap: se prueba con un editor falso.

import { canApplyReplace, withOriginMark } from './applyProposal.js'
import { getLang, tIn } from '../i18n/index.js'

/** @typedef {import('./bridge.js').Selection} Selection */
/** @typedef {import('./bridge.js').ApplyResult} ApplyResult */
/** @typedef {import('./chatState.js').Proposal} Proposal */

/** @param {string} [lang] */
export const changedMessage = (lang = getLang()) => tIn(lang, 'assistant.editorApply.changed')
const noEditor = () => tIn(getLang(), 'assistant.editorApply.noEditor')
const noSelection = () => tIn(getLang(), 'assistant.editorApply.noSelection')
const failed = () => tIn(getLang(), 'assistant.notices.applyFailed')

/**
 * @param {import('@tiptap/react').Editor|null} editor
 * @param {Proposal} proposal
 * @param {Selection|null} selection  La selección con la que se pidió el atajo (solo para `replace_selection`).
 * @returns {ApplyResult}
 */
export function applyProposalToEditor(editor, proposal, selection) {
  if (!editor || editor.isDestroyed) return { ok: false, error: noEditor() }
  const markdown = withOriginMark(String(proposal?.markdown ?? ''), proposal?.source)
  const doc = editor.state.doc

  if (proposal?.kind === 'append') {
    const done = editor.chain().insertContentAt(doc.content.size, markdown).run()
    return done ? { ok: true } : { ok: false, error: failed() }
  }

  if (proposal?.kind === 'replace_selection') {
    if (!selection || selection.sheetId !== proposal.sheetId) return { ok: false, error: noSelection() }
    const { from, to } = selection
    const valid = Number.isInteger(from) && Number.isInteger(to) && from >= 0 && from < to && to <= doc.content.size
    // Mismo cálculo que al guardar la selección (separador '\n'): si no coincide, falla cerrado.
    if (!valid || !canApplyReplace(doc.textBetween(from, to, '\n'), selection.text)) {
      return { ok: false, error: changedMessage() }
    }
    const done = editor.chain().insertContentAt({ from, to }, markdown).run()
    return done ? { ok: true } : { ok: false, error: failed() }
  }

  return { ok: false, error: failed() }
}
