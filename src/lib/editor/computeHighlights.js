/**
 * Qué resaltar en una hoja: los `[[links]]` a temas y las coincidencias del
 * buscador de la carpeta (ADR-017). Ver docs/features/folder.md.
 *
 * Trabaja sobre el documento de ProseMirror pero es una función pura (no crea
 * decoraciones ni toca la vista): `highlightExtension.js` la usa para pintar,
 * y así se puede probar sin navegador.
 *
 * Recorre cada bloque de texto armando su texto plano con un mapa índice →
 * posición del documento, para que un `[[link]]` o una coincidencia que cruza
 * un cambio de formato (ej. negrita a la mitad) se detecte igual.
 */

import { findMatches } from './matches.js'

/** Igual que `WIKI_LINK_PATTERN` de lib/markdown/wikiLinks.js, sin la forma escapada (en el editor no hay escapes). */
const WIKI_LINK = /\[\[([^[\]]+?)\]\]/g
/** Marcador para nodos inline que no son texto (ej. salto de línea): ocupan 1 posición. */
const LEAF = '￼'

/**
 * @typedef {{from: number, to: number}} Range
 * @typedef {{from: number, to: number, title: string}} WikiRange
 */

/**
 * @param {import('@tiptap/pm/model').Node} doc
 * @param {string} term - Texto buscado ('' = sin búsqueda).
 * @param {number|null} current - Índice de la coincidencia "actual" dentro de ESTA hoja.
 * @returns {{wikiLinks: WikiRange[], hits: Range[], current: number|null}}
 */
export function computeHighlights(doc, term, current) {
  const wikiLinks = []
  const hits = []

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true

    let text = ''
    /** positions[i] = posición en el documento del carácter i de `text`. */
    const positions = []
    node.forEach((child, offset) => {
      const start = pos + 1 + offset
      if (child.isText) {
        for (let i = 0; i < child.text.length; i += 1) positions.push(start + i)
        text += child.text
      } else {
        positions.push(start)
        text += LEAF
      }
    })

    const toDoc = ({ from, to }) => ({ from: positions[from], to: positions[to - 1] + 1 })

    for (const match of text.matchAll(WIKI_LINK)) {
      const title = match[1].trim()
      if (title) wikiLinks.push({ ...toDoc({ from: match.index, to: match.index + match[0].length }), title })
    }
    for (const match of findMatches(text, term)) hits.push(toDoc(match))

    return false
  })

  const inRange = current != null && current >= 0 && current < hits.length
  return { wikiLinks, hits, current: inRange ? current : null }
}
