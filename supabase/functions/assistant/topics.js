// Temas de una hoja para el servidor del asistente.
//
// ⚠️ COPIA DELIBERADA de la lógica de `src/lib/markdown/headings.js`: la Edge
// Function corre en Deno y no puede importar de `src/`. Si cambia una, hay que
// cambiar la otra. `topics.test.js` compara ambas sobre documentos de muestra
// para que nunca se desvíen sin que salte un test.
//
// Diferencia a propósito: el cliente conserva los headings vacíos (necesita el
// índice exacto del DOM); acá se descartan, igual que hace el índice de temas.

const FENCE = /^\s{0,3}(`{3,}|~{3,})/
// `#` + espacio (`#hashtag` NO es heading), sin indentación, hasta nivel 4.
const HEADING = /^(#{1,4})(?:[ \t]+(.*?))?[ \t]*$/

/** Quita las marcas de formato más comunes para dejar el tema como texto plano. */
function plainText(text) {
  return text
    .replace(/\\?\[\\?\[([^[\]]+?)\\?\]\\?\]/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .replace(/\\(.)/g, '$1')
    .trim()
}

/**
 * Textos de los headings `#`–`####` no vacíos, ignorando bloques de código.
 * @param {string | null | undefined} markdown
 * @returns {string[]}
 */
export function extractTopics(markdown) {
  const topics = []
  let fence = null

  for (const line of (markdown ?? '').split(/\r?\n/)) {
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
    const text = plainText(match[2] ?? '')
    if (text) topics.push(text)
  }

  return topics
}
