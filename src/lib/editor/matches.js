/**
 * Coincidencias de búsqueda dentro de un texto (buscador de la carpeta,
 * ver docs/features/folder.md). Función pura: la usa la extensión del editor
 * para resaltar, pero no sabe nada de TipTap.
 */

/**
 * Todas las apariciones de `term` en `text`, sin distinguir mayúsculas y sin
 * solaparse (como el buscador de cualquier editor).
 * @param {string} text
 * @param {string} term
 * @returns {Array<{from: number, to: number}>} Rangos `[from, to)` dentro de `text`.
 */
export function findMatches(text, term) {
  const needle = (term ?? '').trim().toLowerCase()
  if (!needle) return []

  const haystack = (text ?? '').toLowerCase()
  const matches = []
  for (let from = haystack.indexOf(needle); from !== -1; from = haystack.indexOf(needle, from + needle.length)) {
    matches.push({ from, to: from + needle.length })
  }
  return matches
}
