/**
 * Consultas `IN (…)` partidas en tramos (puras). Un `.in()` con cientos de ids
 * arma una URL tan larga que el servidor la rechaza: el export de una cuenta
 * con muchas hojas fallaba al traer los adjuntos. Ver docs/features/markdown-export.md.
 */

/**
 * @template T
 * @param {T[]} items
 * @param {number} size
 * @returns {T[][]}
 */
export function chunk(items, size) {
  const parts = []
  for (let from = 0; from < items.length; from += size) parts.push(items.slice(from, from + size))
  return parts
}

/**
 * Llama a `listPart` una vez por tramo de ids y junta las filas, en orden.
 * Corta en el primer error (devuelve `data: []` y ese error).
 * @template R
 * @param {string[]} ids
 * @param {number} size
 * @param {(ids: string[]) => Promise<{data: R[]|null, error: string|null}>} listPart
 * @returns {Promise<{data: R[], error: string|null}>}
 */
export async function listInChunks(ids, size, listPart) {
  const rows = []
  for (const part of chunk(ids, size)) {
    const { data, error } = await listPart(part)
    if (error) return { data: [], error }
    rows.push(...(data ?? []))
  }
  return { data: rows, error: null }
}
