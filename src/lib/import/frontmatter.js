/**
 * Frontmatter YAML simple (`clave: valor`) de un `.md` importado. Alcanza para
 * el que escribe el export de Studree (lib/export/frontmatter.js) y el de
 * Obsidian; no es un parser YAML completo a propósito (sin dependencia nueva).
 */

const BLOCK = /^---\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/

/** @param {string} raw */
function parseValue(raw) {
  const value = raw.trim()
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value.slice(1, -1).replace(/\\(["\\])/g, '$1')
  }
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replace(/''/g, "'")
  }
  return value
}

/**
 * @param {string} text
 * @returns {{meta: Record<string, string>, body: string}}
 */
export function splitFrontmatter(text) {
  const source = (text ?? '').replace(/^\uFEFF/, '')
  const match = source.match(BLOCK)
  if (!match) return { meta: {}, body: source }
  const meta = {}
  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    const colon = line.indexOf(':')
    if (colon <= 0) continue
    meta[line.slice(0, colon).trim()] = parseValue(line.slice(colon + 1))
  }
  return { meta, body: source.slice(match[0].length).replace(/^(\r?\n)+/, '') }
}
