// Cuerpo de una sección de resumen (Markdown liviano) → bloques para pintar con
// elementos de React. Puro. Nunca produce HTML: todo es texto literal.

/**
 * @typedef {{text: string, bold: boolean}} Inline
 * @typedef {{type: 'p', inlines: Inline[]} | {type: 'ul'|'ol', items: Inline[][]}} Block
 */

/**
 * `**texto**` → negrita; un `**` sin cerrar queda literal.
 * @param {string} text
 * @returns {Inline[]}
 */
function parseInlines(text) {
  /** @type {Inline[]} */
  const out = []
  let rest = text
  let literal = ''
  const flush = () => {
    if (literal) out.push({ text: literal, bold: false })
    literal = ''
  }
  while (rest.length > 0) {
    const open = rest.indexOf('**')
    if (open === -1) {
      literal += rest
      break
    }
    const close = rest.indexOf('**', open + 2)
    if (close === -1 || close === open + 2) {
      literal += rest.slice(0, open + 2)
      rest = rest.slice(open + 2)
      continue
    }
    literal += rest.slice(0, open)
    flush()
    out.push({ text: rest.slice(open + 2, close), bold: true })
    rest = rest.slice(close + 2)
  }
  flush()
  return out
}

const UL = /^[-*] +(.*)$/
const OL = /^\d+\. +(.*)$/

/**
 * @param {string} body
 * @returns {Block[]}
 */
export function parseSummaryBody(body) {
  if (typeof body !== 'string') return []
  /** @type {Block[]} */
  const blocks = []
  /** @type {string[]} */
  let para = []
  const flushPara = () => {
    if (para.length > 0) blocks.push({ type: 'p', inlines: parseInlines(para.join(' ')) })
    para = []
  }
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) {
      flushPara()
      continue
    }
    const ul = UL.exec(line)
    const ol = ul ? null : OL.exec(line)
    const match = ul ?? ol
    if (match) {
      flushPara()
      const type = ul ? 'ul' : 'ol'
      const last = blocks[blocks.length - 1]
      const item = parseInlines(match[1])
      if (last && last.type === type) last.items.push(item)
      else blocks.push({ type, items: [item] })
    } else {
      para.push(line)
    }
  }
  flushPara()
  return blocks
}
