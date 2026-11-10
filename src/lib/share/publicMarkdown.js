/**
 * Markdown apto para la vista pública de una materia compartida: sin adjuntos y
 * con los `[[Tema]]` como texto. El contenido sigue siendo dato no confiable:
 * se renderiza con el mismo visor de lectura de siempre, nunca con HTML crudo.
 */

const ATTACHMENT_IMAGE = /!\[[^\]]*\]\(adjunto:[^)]*\)/g
const ATTACHMENT_LINK = /\[([^\]]*)\]\(adjunto:[^)]*\)/g
const WIKI_LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

/**
 * @param {string|null|undefined} markdown
 * @returns {string}
 */
export function toPublicMarkdown(markdown) {
  if (!markdown) return ''
  return String(markdown)
    .replace(ATTACHMENT_IMAGE, '')
    .replace(ATTACHMENT_LINK, '$1')
    .replace(WIKI_LINK, (_, target, label) => (label || target).trim())
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
