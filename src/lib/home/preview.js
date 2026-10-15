/**
 * Preview de una hoja para "Seguí donde dejaste" (ver docs/features/home.md).
 * Las hojas no tienen título (La Carpeta): se muestra el primer renglón con
 * texto, sin la sintaxis de Markdown. Función pura.
 */

const FENCE = /^(```|~~~)/
const HORIZONTAL_RULE = /^([-*_]\s*){3,}$/

/**
 * Quita la sintaxis inline: `[[links]]` (también escapados), imágenes, links,
 * negrita/itálica/tachado y código. El `_` suelto se deja (`snake_case`).
 * @param {string} text
 * @returns {string}
 */
function stripInline(text) {
  return text
    .replace(/\\\[\\\[(.+?)\\\]\\\]/g, '$1')
    .replace(/\[\[(.+?)\]\]/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|~~|\*|`)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {string|null|undefined} markdown
 * @param {number} [max=120]
 * @returns {string} Primer renglón con texto, cortado con "…", o '' si no hay.
 */
export function buildPreview(markdown, max = 120) {
  if (!markdown) return ''
  let inFence = false

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim()
    if (FENCE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence || !line || HORIZONTAL_RULE.test(line)) continue

    const text = stripInline(
      line
        .replace(/^#{1,6}(\s+|$)/, '')
        .replace(/^>\s*/, '')
        .replace(/^([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/, ''),
    )
    if (text) return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
  }
  return ''
}
