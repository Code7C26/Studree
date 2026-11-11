/**
 * Imágenes y archivos referenciados desde un `.md` importado que existen en el
 * mismo `.zip` (ver docs/features/import.md). Se suben como adjuntos y la
 * referencia se reescribe a `adjunto:<id>`.
 *
 * - `![t](ruta)` / `[t](ruta)`: ruta relativa al `.md` (acepta `%20`, `<…>`, `../`).
 * - `![[archivo.ext]]` (Obsidian): por nombre, en cualquier carpeta.
 * - `[[Tema]]` (sin `!`) es un link a un tema de Studree: NO se toca.
 */

import { codeRanges, unescapeMarkdownText } from '../attachments/refs.js'

const LINK = /(!?)\[((?:\\.|[^[\]\\])*)\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+"[^"]*")?\s*\)/g
const EMBED = /!\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g
const SCHEME = /^[a-z][a-z0-9+.-]*:/i

const MIME_BY_EXTENSION = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  svg: 'image/svg+xml', bmp: 'image/bmp', heic: 'image/heic', pdf: 'application/pdf', txt: 'text/plain',
  csv: 'text/csv', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  mp3: 'audio/mpeg', mp4: 'video/mp4', zip: 'application/zip',
}

/** @param {string} name */
export function mimeFromName(name) {
  const extension = (name.split('.').pop() ?? '').toLowerCase()
  return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream'
}

/** @param {string} path */
const basename = (path) => path.split('/').pop() ?? path

/**
 * @typedef {{paths: Set<string>, byName: Map<string, string>}} ZipIndex
 * @param {string[]} filePaths - Archivos del zip que no son `.md`.
 * @returns {ZipIndex}
 */
export function buildZipIndex(filePaths) {
  const byName = new Map()
  for (const path of filePaths) {
    const key = basename(path).toLowerCase()
    if (!byName.has(key)) byName.set(key, path)
  }
  return { paths: new Set(filePaths), byName }
}

/** Ruta relativa → ruta dentro del zip (resuelve `./` y `../`). */
function resolvePath(fromDir, target) {
  const parts = fromDir ? fromDir.split('/') : []
  for (const segment of target.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') parts.pop()
    else parts.push(segment)
  }
  return parts.join('/')
}

/** @param {string} raw */
function decodeTarget(raw) {
  const unwrapped = raw.startsWith('<') && raw.endsWith('>') ? raw.slice(1, -1) : raw
  try {
    return decodeURIComponent(unwrapped)
  } catch {
    return unwrapped
  }
}

/**
 * @typedef {{match: string, index: number, isImage: boolean, text: string, zipPath: string}} MediaRef
 * @param {string} markdown
 * @param {string} mdPath - Ruta del `.md` dentro del zip.
 * @param {ZipIndex} index
 * @returns {MediaRef[]}
 */
export function findMediaRefs(markdown, mdPath, index) {
  const source = markdown ?? ''
  const code = codeRanges(source)
  const inCode = (position) => code.some(([start, end]) => position >= start && position < end)
  const dir = mdPath.includes('/') ? mdPath.slice(0, mdPath.lastIndexOf('/')) : ''
  const refs = []

  for (const match of source.matchAll(LINK)) {
    if (inCode(match.index)) continue
    const target = decodeTarget(match[3])
    if (SCHEME.test(target) || target.startsWith('#') || /\.md$/i.test(target)) continue
    const zipPath = resolvePath(dir, target)
    if (!index.paths.has(zipPath)) continue
    refs.push({ match: match[0], index: match.index, isImage: match[1] === '!', text: unescapeMarkdownText(match[2]), zipPath })
  }

  for (const match of source.matchAll(EMBED)) {
    if (inCode(match.index)) continue
    const name = match[1].trim()
    const zipPath = index.byName.get(basename(name).toLowerCase())
    if (!zipPath) continue // ![[Otra nota]] (sin archivo en el zip) queda como está
    refs.push({ match: match[0], index: match.index, isImage: mimeFromName(name).startsWith('image/'), text: basename(name), zipPath })
  }

  return refs.sort((a, b) => a.index - b.index)
}

/**
 * @param {string} markdown
 * @param {MediaRef[]} refs - Las de `findMediaRefs` sobre ESTE markdown.
 * @param {(ref: MediaRef) => string|null} replace - null = dejar igual.
 * @returns {string}
 */
export function replaceMediaRefs(markdown, refs, replace) {
  let out = ''
  let cursor = 0
  for (const ref of [...refs].sort((a, b) => a.index - b.index)) {
    out += markdown.slice(cursor, ref.index) + (replace(ref) ?? ref.match)
    cursor = ref.index + ref.match.length
  }
  return out + markdown.slice(cursor)
}
