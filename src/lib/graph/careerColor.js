/**
 * El color de una materia sigue al de su carrera (docs/features/careers.md). La carpeta, el
 * margen de las hojas, las pestañas y el índice leen `subjects.color` (ADR-018), así que cambiar
 * el de la carrera tiene que bajar a sus materias. Funciones puras.
 */

import { DEFAULT_COLOR } from '../../constants/palette.js'

/**
 * Copia de las filas con el color nuevo en las materias de esa carrera.
 * @template {{career_id?: string, color?: string}} T
 * @param {T[]|null|undefined} rows
 * @param {string} careerId
 * @param {string} color
 * @returns {T[]}
 */
export function withCareerColor(rows, careerId, color) {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => (row.career_id === careerId ? { ...row, color } : row))
}

/**
 * Color de una materia nueva: el pedido explícito, si no el de su carrera, si no el verde.
 * @param {string|undefined} requested
 * @param {string|null|undefined} careerColor
 * @returns {string}
 */
export function pickSubjectColor(requested, careerColor) {
  return requested ?? careerColor ?? DEFAULT_COLOR
}
