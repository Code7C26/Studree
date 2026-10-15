/**
 * Temas de una hoja: los headings `#`–`####` de su Markdown (ADR-017).
 * Arman el índice de temas de la carpeta y son el destino de los `[[links]]`.
 * Ver docs/features/folder.md.
 *
 * Función pura: no sabe nada de React ni de TipTap.
 */

const FENCE = /^\s{0,3}(`{3,}|~{3,})/
/**
 * `#` seguido de espacio (`#hashtag` NO es un heading), SIN indentación: el
 * serializador nunca indenta los headings de primer nivel, y uno indentado
 * está dentro de una lista (no es un tema del índice ni un `:scope > hN` del
 * editor). Hasta nivel 4 (lo que permite el editor). El texto puede ser vacío.
 */
const HEADING = /^(#{1,4})(?:[ \t]+(.*?))?[ \t]*$/

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
 * @property {string} text - Texto plano del tema ('' si el heading está vacío).
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
    // Los vacíos (`# `) también cuentan: el editor los dibuja como heading y el
    // `index` tiene que coincidir con el n-ésimo heading del DOM. Quien muestra
    // el índice los filtra.
    headings.push({ level: /** @type {1|2|3|4} */ (match[1].length), text: plainText(match[2] ?? ''), index: headings.length })
  }

  return headings
}
