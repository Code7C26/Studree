/**
 * Links a temas con sintaxis `[[Tema]]` (ADR-017, deroga ADR-015).
 * Ver docs/features/folder.md y docs/features/sheet-editor.md.
 *
 * `[[Mitosis]]` en una hoja es un salto al tema (heading `# Mitosis`) de la
 * misma materia. Se resuelve en el cliente, contra el índice de temas de la
 * carpeta: no hay tabla de links.
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
 * `\[\[X\]\]` → `[[X]]`. `prosemirror-markdown` escapa los corchetes al
 * serializar; sin esto, el Markdown guardado (y el export para IA) mostraría
 * los links con barras invertidas.
 * @param {string} markdown
 * @returns {string}
 */
export function unescapeWikiLinks(markdown) {
  return (markdown ?? '').replace(/\\\[\\\[([^[\]]+?)\\\]\\\]/g, '[[$1]]')
}
