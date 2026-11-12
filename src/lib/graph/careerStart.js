/**
 * Mapa de carrera: columnas por año y la línea de inicio (docs/features/career-map.md).
 * Funciones puras: no saben nada de React Flow ni de Supabase.
 */

/** Alto reservado arriba de cada columna para su título ("1.º año"). */
export const YEAR_HEADER_HEIGHT = 56
/** Alto del nodo de inicio. */
export const START_NODE_HEIGHT = 56
/** Separación entre el nodo de inicio y la primera columna. */
const START_GAP = 160

/**
 * Id del nodo título de una columna de año (`null` = "sin año").
 * @param {number|null} year
 */
export const yearHeaderId = (year) => `year:${year ?? 'none'}`

/**
 * Una columna por año (en orden) y, al final, "sin año". Dentro de cada columna, en el orden de
 * la carrera (`position`) y después por nombre.
 * @param {Array<{id: string, name: string, position?: number, year?: number|null}>} subjects
 * @param {{width: number, height: number}} size
 * @param {{gapX?: number, gapY?: number}} [options]
 * @returns {{positions: Map<string, {x: number, y: number}>, columns: Array<{year: number|null, x: number, y: number}>}}
 */
export function computeYearLayout(subjects, { width, height }, { gapX = 96, gapY = 32 } = {}) {
  const groups = new Map()
  for (const subject of subjects) {
    const year = subject.year ?? null
    if (!groups.has(year)) groups.set(year, [])
    groups.get(year).push(subject)
  }
  const years = [...groups.keys()].sort((a, b) => (a == null ? 1 : b == null ? -1 : a - b))

  const positions = new Map()
  const columns = years.map((year, index) => {
    const x = index * (width + gapX)
    const members = groups
      .get(year)
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name))
    members.forEach((subject, row) => {
      positions.set(subject.id, { x, y: YEAR_HEADER_HEIGHT + row * (height + gapY) })
    })
    return { year, x, y: 0 }
  })
  return { positions, columns }
}

/**
 * A dónde va la línea de inicio: con años, a cada columna; sin años, a cada materia que no
 * depende de otra (ninguna unión la tiene como destino). Así ninguna materia queda suelta.
 * @param {Array<{id: string}>} subjects
 * @param {Array<{subject_id: string, requires_id: string}>} links - Uniones visibles.
 * @param {Array<{year: number|null}>} columns - Columnas de año (vacío si no se usan años).
 * @returns {string[]} ids de nodos destino.
 */
export function startTargets(subjects, links, columns) {
  if (columns.length > 0) return columns.map((column) => yearHeaderId(column.year))
  const ids = new Set(subjects.map((subject) => subject.id))
  const targets = new Set(links.filter((link) => ids.has(link.requires_id)).map((link) => link.subject_id))
  return subjects.filter((subject) => !targets.has(subject.id)).map((subject) => subject.id)
}

/**
 * Dónde va el nodo de inicio: a la izquierda de todo y a media altura.
 * @param {Array<{x: number, y: number}>} positions - Posiciones de las materias (esquina superior izquierda).
 * @param {{width: number, height: number}} size
 * @returns {{x: number, y: number}}
 */
export function startPosition(positions, { width, height }) {
  if (positions.length === 0) return { x: -width - START_GAP, y: 0 }
  const minX = Math.min(...positions.map((p) => p.x))
  const minY = Math.min(...positions.map((p) => p.y))
  const maxY = Math.max(...positions.map((p) => p.y))
  return { x: minX - START_GAP - 180, y: (minY + maxY) / 2 + height / 2 - START_NODE_HEIGHT / 2 }
}
