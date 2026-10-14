/**
 * Utilidades de posición para los canvas con layout HÍBRIDO (ADR-012):
 * dagre propone, el usuario dispone. Un nodo con posición guardada se dibuja
 * ahí; uno sin posición (`null`) usa la que calcula el auto-layout.
 *
 * Funciones puras: no saben nada de React Flow ni de Supabase.
 */

/**
 * Posición guardada si existe; si no, la automática.
 * @param {number|null|undefined} x
 * @param {number|null|undefined} y
 * @param {{x: number, y: number}|undefined} auto
 * @returns {{x: number, y: number}}
 */
export function resolvePosition(x, y, auto) {
  if (x != null && y != null) return { x, y }
  return auto ?? { x: 0, y: 0 }
}

/**
 * Layout en grilla para un canvas SIN aristas (carrera sin correlativas,
 * ADR-013). dagre sin aristas apila todo en una sola columna, que con muchas
 * materias queda como una lista larguísima.
 *
 * @param {string[]} ids
 * @param {{width: number, height: number, columns?: number, gapX?: number, gapY?: number}} options
 * @returns {Map<string, {x: number, y: number}>}
 */
export function computeGridLayout(ids, { width, height, columns = 4, gapX = 48, gapY = 40 }) {
  const positions = new Map()
  ids.forEach((id, index) => {
    positions.set(id, {
      x: (index % columns) * (width + gapX),
      y: Math.floor(index / columns) * (height + gapY),
    })
  })
  return positions
}

/**
 * Busca el primer lugar libre a partir de `start`, avanzando de a `step`, para
 * que un nodo nuevo no nazca encima de otro.
 *
 * @param {{x: number, y: number}} start
 * @param {Array<{x: number, y: number}>} occupied - Posiciones actuales de los nodos.
 * @param {{x: number, y: number}} step - Cuánto correrse en cada intento.
 * @param {{width: number, height: number}} size - Tamaño del nodo (para detectar choque).
 * @returns {{x: number, y: number}}
 */
export function findFreeSpot(start, occupied, step, size) {
  const collides = (candidate) =>
    occupied.some(
      (other) =>
        Math.abs(other.x - candidate.x) < size.width * 0.8 && Math.abs(other.y - candidate.y) < size.height * 0.8,
    )

  let candidate = { ...start }
  for (let attempt = 0; attempt < 50 && collides(candidate); attempt += 1) {
    candidate = { x: candidate.x + step.x, y: candidate.y + step.y }
  }
  return candidate
}
