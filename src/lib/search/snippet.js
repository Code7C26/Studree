/**
 * Fragmento de texto alrededor de una coincidencia, para el buscador de
 * contenido del Command Palette (Fase 5, ver docs/features/navigation-shell.md).
 * Pura: no sabe nada de React ni de los services.
 */

/** Limpia lo mínimo de sintaxis Markdown para que el fragmento se lea como texto plano. */
function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_~`]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Devuelve un fragmento de `content` centrado en la primera aparición de
 * `query` (case-insensitive), o `null` si no aparece.
 *
 * @param {string} content
 * @param {string} query
 * @param {number} [radius] - Caracteres de contexto a cada lado.
 * @returns {string|null}
 */
export function buildContentSnippet(content, query, radius = 50) {
  const plain = stripMarkdown(content ?? '')
  const q = query.trim().toLowerCase()
  if (!q) return null

  const matchIndex = plain.toLowerCase().indexOf(q)
  if (matchIndex === -1) return null

  const start = Math.max(0, matchIndex - radius)
  const end = Math.min(plain.length, matchIndex + q.length + radius)

  const prefix = start > 0 ? '…' : ''
  const suffix = end < plain.length ? '…' : ''

  return `${prefix}${plain.slice(start, end)}${suffix}`
}
