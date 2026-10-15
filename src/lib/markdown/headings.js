/**
 * Temas de una hoja: los headings `#`–`####` de su Markdown (ADR-017).
 * Arman el índice de temas de la carpeta y son el destino de los `[[links]]`.
 * Ver docs/features/folder.md.
 *
 * Función pura: no sabe nada de React ni de TipTap.
 */

const FENCE = /^\s{0,3}(`{3,}|~{3,})/
/** `#` seguido de espacio: `#hashtag` NO es un heading. Hasta nivel 4 (lo que permite el editor). */
const HEADING = /^\s{0,3}(#{1,4})\s+(.+?)\s*#*\s*$/

/** Quita las marcas de formato más comunes para mostrar el tema como texto plano. */
function plainText(text) {
  return text
    .replace(/\\?\[\\?\[([^[\]]+?)\\?\]\\?\]/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .replace(/\\(.)/g, '$1')
    .trim()
}

/**
 * @typedef {Object} Heading
 * @property {1|2|3|4} level
 * @property {string} text - Texto plano del tema.
 * @property {number} index - Posición entre los headings de ESA hoja (0, 1, 2…):
 *   sirve para encontrar el n-ésimo heading del editor y hacer scroll.
 */

/**
 * @param {string} markdown
 * @returns {Heading[]}
 */
export function extractHeadings(markdown) {
  const headings = []
  let fence = null

  for (const line of (markdown ?? '').split('\n')) {
    const fenceMatch = line.match(FENCE)
    if (fenceMatch) {
      const marker = fenceMatch[1][0]
      if (fence === null) fence = marker
      else if (fence === marker) fence = null
      continue
    }
    if (fence !== null) continue

    const match = line.match(HEADING)
    if (!match) continue
    const text = plainText(match[2])
    if (!text) continue
    headings.push({ level: /** @type {1|2|3|4} */ (match[1].length), text, index: headings.length })
  }

  return headings
}
