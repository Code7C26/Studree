/**
 * Links entre hojas con sintaxis `[[Título de otra hoja]]` (ADR-015).
 * Ver docs/features/subject-map.md y docs/features/sheet-editor.md.
 *
 * El Markdown es la fuente de verdad (ADR-011): conectar dos hojas en el canvas
 * es AGREGAR un `[[link]]` al contenido, y desconectarlas es quitarlo. La tabla
 * `sheet_links` es solo un índice que la base deriva de este texto (trigger
 * `refresh_sheet_links` en la migración 0003) — la regex de acá y la de SQL
 * tienen que aceptar lo mismo.
 *
 * Funciones puras: no saben nada de React, TipTap ni Supabase.
 */

/**
 * `[[Título]]`, también en la forma escapada `\[\[Título\]\]` que produce el
 * serializador de Markdown. El título no puede contener corchetes.
 */
export const WIKI_LINK_PATTERN = /\\?\[\\?\[([^[\]]+?)\\?\]\\?\]/g

/** Quita los escapes de Markdown (`a\_b` → `a_b`). */
function unescapeMarkdown(text) {
  return text.replace(/\\(.)/g, '$1')
}

/** Clave de comparación: los links no distinguen mayúsculas ni espacios de borde. */
function normalizeTitle(title) {
  return title.trim().toLowerCase()
}

/**
 * Títulos enlazados en un Markdown, sin repetir (comparando sin mayúsculas) y
 * en el orden en que aparecen.
 * @param {string} markdown
 * @returns {string[]}
 */
export function extractWikiLinks(markdown) {
  const seen = new Set()
  const titles = []
  for (const match of (markdown ?? '').matchAll(WIKI_LINK_PATTERN)) {
    const title = unescapeMarkdown(match[1]).trim()
    const key = normalizeTitle(title)
    if (!title || seen.has(key)) continue
    seen.add(key)
    titles.push(title)
  }
  return titles
}

/**
 * Agrega `[[title]]` en una línea nueva al final, salvo que ya esté enlazado.
 * @param {string} markdown
 * @param {string} title
 * @returns {string}
 */
export function appendWikiLink(markdown, title) {
  const content = markdown ?? ''
  const already = extractWikiLinks(content).some((linked) => normalizeTitle(linked) === normalizeTitle(title))
  if (already) return content
  const body = content.trimEnd()
  return body ? `${body}\n\n[[${title.trim()}]]` : `[[${title.trim()}]]`
}

/**
 * Quita el link a `title`:
 * - una línea que es SOLO ese link (como la que agrega el canvas al conectar)
 *   se borra entera;
 * - dentro de una frase, `[[title]]` queda como texto plano (no se borra la
 *   palabra, para no romper la oración).
 * @param {string} markdown
 * @param {string} title
 * @returns {string}
 */
export function removeWikiLink(markdown, title) {
  const target = normalizeTitle(title)
  const isTarget = (inner) => normalizeTitle(unescapeMarkdown(inner)) === target
  const standaloneLine = new RegExp(`^\\s*${WIKI_LINK_PATTERN.source}\\s*$`)

  const lines = (markdown ?? '').split('\n').filter((line) => {
    const match = line.match(standaloneLine)
    return !(match && isTarget(match[1]))
  })

  const replaced = lines
    .join('\n')
    .replace(WIKI_LINK_PATTERN, (whole, inner) => (isTarget(inner) ? unescapeMarkdown(inner).trim() : whole))
  return replaced.replace(/\n{3,}/g, '\n\n').trimEnd()
}

/**
 * `\[\[X\]\]` → `[[X]]`. `prosemirror-markdown` escapa los corchetes al
 * serializar; sin esto, el Markdown guardado (y el export para IA) mostraría
 * los links con barras invertidas.
 * @param {string} markdown
 * @returns {string}
 */
export function unescapeWikiLinks(markdown) {
  return (markdown ?? '').replace(/\\\[\\\[([^[\]]+?)\\\]\\\]/g, '[[$1]]')
}

/**
 * ¿El título dado coincide con alguno de la lista? (sin mayúsculas).
 * @param {string[]} titles
 * @param {string} title
 * @returns {boolean}
 */
export function includesTitle(titles, title) {
  const key = normalizeTitle(title)
  return titles.some((candidate) => normalizeTitle(candidate) === key)
}
