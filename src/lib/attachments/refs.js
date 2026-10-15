/**
 * Referencias a adjuntos dentro del Markdown de una hoja (Fase 13, ver
 * docs/features/attachments.md). El Markdown sigue siendo la fuente de verdad
 * (ADR-011): un adjunto es `![nombre](adjunto:<id>)` (imagen) o
 * `[nombre](adjunto:<id>)` (cualquier otro archivo). Nunca se guarda una URL:
 * el bucket es privado y los links firmados vencen.
 *
 * Puras: las usan el editor, el export, el import y las plantillas.
 */

export const ATTACHMENT_PROTOCOL = 'adjunto'
const PREFIX = `${ATTACHMENT_PROTOCOL}:`

/**
 * `![texto](adjunto:id "título opcional")` o sin `!`. El texto admite `\[` `\]`;
 * un `[` sin escapar no entra en el texto (si no, `[![img](adjunto:1)](http://x)`
 * se leería como un link de texto `![img`).
 */
const REF_PATTERN = /(!?)\[((?:\\.|[^[\]\\])*)\]\(adjunto:([^)\s]+)(?:\s+"[^"]*")?\)/g

/** Bloques ``` / ~~~ y código en línea: ahí una referencia es texto, no un adjunto. */
const CODE_PATTERN = /(^|\n)(```|~~~)[\s\S]*?(\n\2[^\n]*(?=\n|$)|$)|`[^`\n]*`/g

/** @param {string} id */
export function attachmentHref(id) {
  return `${PREFIX}${id}`
}

/**
 * @param {string|null|undefined} href
 * @returns {string|null} El id del adjunto, o null si no es una referencia `adjunto:`.
 */
export function parseAttachmentHref(href) {
  return typeof href === 'string' && href.startsWith(PREFIX) ? href.slice(PREFIX.length) || null : null
}

/**
 * Escapa el texto de un link/imagen Markdown (`[texto]`).
 * @param {string} text
 */
export const escapeLinkText = (text) => text.replace(/[[\]\\]/g, (char) => `\\${char}`)
/** @param {string} text */
const unescapeText = (text) => text.replace(/\\([[\]\\])/g, '$1')

/**
 * @param {{id: string, name: string, isImage: boolean}} attachment
 * @returns {string}
 */
export function attachmentMarkdown({ id, name, isImage }) {
  return `${isImage ? '!' : ''}[${escapeLinkText(name)}](${attachmentHref(id)})`
}

/**
 * Rangos [inicio, fin) ocupados por código (bloques y código en línea). Lo usa
 * también `lib/import/mediaRefs.js`.
 * @param {string} markdown
 * @returns {Array<[number, number]>}
 */
export function codeRanges(markdown) {
  const ranges = []
  for (const match of (markdown ?? '').matchAll(CODE_PATTERN)) ranges.push([match.index, match.index + match[0].length])
  return ranges
}

/**
 * @typedef {{match: string, id: string, text: string, isImage: boolean, index: number}} AttachmentRef
 */

/**
 * @param {string} markdown
 * @returns {AttachmentRef[]}
 */
export function findAttachmentRefs(markdown) {
  const source = markdown ?? ''
  const code = codeRanges(source)
  const inCode = (index) => code.some(([start, end]) => index >= start && index < end)
  const refs = []
  for (const match of source.matchAll(REF_PATTERN)) {
    if (inCode(match.index)) continue
    refs.push({ match: match[0], isImage: match[1] === '!', text: unescapeText(match[2]), id: match[3], index: match.index })
  }
  return refs
}

/**
 * Reemplaza cada referencia por lo que devuelva `replace` (null = dejarla igual).
 * @param {string} markdown
 * @param {(ref: AttachmentRef) => string|null} replace
 * @returns {string}
 */
export function rewriteAttachmentRefs(markdown, replace) {
  const refs = findAttachmentRefs(markdown)
  let out = ''
  let cursor = 0
  for (const ref of refs) {
    const next = replace(ref)
    out += markdown.slice(cursor, ref.index) + (next ?? ref.match)
    cursor = ref.index + ref.match.length
  }
  return out + (markdown ?? '').slice(cursor)
}

/**
 * Para "Guardar como plantilla": una plantilla no arrastra archivos de otra hoja.
 * @param {string} markdown
 */
export function stripAttachmentRefs(markdown) {
  return rewriteAttachmentRefs(markdown, (ref) => (ref.isImage ? '' : ref.text))
}

/**
 * Para el `.md` único y "Copiar para IA" (no llevan archivos).
 * @param {string} markdown
 */
export function describeAttachmentRefs(markdown) {
  return rewriteAttachmentRefs(markdown, (ref) => `[${ref.isImage ? 'imagen' : 'archivo'}: ${ref.text}]`)
}

/** @param {string} mime */
export function isImageMime(mime) {
  return typeof mime === 'string' && mime.startsWith('image/')
}
