/**
 * Extensión de TipTap de la carpeta (ADR-017): pinta los `[[links]]` a temas
 * como links clickeables y resalta las coincidencias del buscador.
 * Ver docs/features/folder.md.
 *
 * Usa DECORACIONES de ProseMirror: no cambian el documento ni el Markdown que
 * se guarda (ADR-011), solo cómo se ve. El cálculo vive en
 * `computeHighlights.js` (puro, testeado); acá solo se arma el plugin.
 */

import { Extension } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { computeHighlights } from './computeHighlights.js'

const highlightKey = new PluginKey('studreeHighlight')

/**
 * @param {import('@tiptap/pm/model').Node} doc
 * @param {string} term
 * @param {number|null} current
 */
function buildState(doc, term, current) {
  const result = computeHighlights(doc, term, current)
  const decorations = [
    ...result.wikiLinks.map(({ from, to, title }) =>
      Decoration.inline(from, to, { class: 'wiki-link', 'data-wiki': title }),
    ),
    ...result.hits.map(({ from, to }, index) =>
      Decoration.inline(from, to, { class: index === result.current ? 'search-hit search-hit-current' : 'search-hit' }),
    ),
  ]
  return { term, current: result.current, hits: result.hits, decorations: DecorationSet.create(doc, decorations) }
}

/**
 * Opciones: `onWikiLink(title)` — se llama al hacer click en un `[[link]]`.
 */
export const HighlightExtension = Extension.create({
  name: 'studreeHighlight',

  addOptions() {
    return { onWikiLink: () => {} }
  },

  addProseMirrorPlugins() {
    const extension = this
    return [
      new Plugin({
        key: highlightKey,
        state: {
          init: (_config, state) => buildState(state.doc, '', null),
          apply(tr, previous) {
            const meta = tr.getMeta(highlightKey)
            if (!meta && !tr.docChanged) return previous
            const term = meta ? meta.term : previous.term
            const current = meta ? meta.current : previous.current
            return buildState(tr.doc, term, current)
          },
        },
        props: {
          decorations: (state) => highlightKey.getState(state).decorations,
          handleClick(_view, _pos, event) {
            const link = event.target instanceof Element ? event.target.closest('.wiki-link') : null
            if (!link) return false
            extension.options.onWikiLink(link.getAttribute('data-wiki'))
            return true
          },
        },
      }),
    ]
  },
})

/**
 * Cambia el término buscado y cuál coincidencia es la "actual" en esta hoja.
 * @param {import('@tiptap/react').Editor} editor
 * @param {string} term
 * @param {number|null} current
 */
export function setSearch(editor, term, current) {
  if (!editor || editor.isDestroyed) return
  editor.view.dispatch(editor.state.tr.setMeta(highlightKey, { term, current }))
}

/**
 * Coincidencias de búsqueda de esta hoja, en orden.
 * @param {import('@tiptap/react').Editor} editor
 * @returns {Array<{from: number, to: number}>}
 */
export function getSearchHits(editor) {
  if (!editor || editor.isDestroyed) return []
  return highlightKey.getState(editor.state)?.hits ?? []
}

/**
 * Scroll a la coincidencia actual (la que tiene `search-hit-current`).
 * @param {import('@tiptap/react').Editor} editor
 */
export function scrollToCurrentHit(editor) {
  if (!editor || editor.isDestroyed) return
  editor.view.dom.querySelector('.search-hit-current')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}
