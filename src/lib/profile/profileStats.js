/**
 * Datos del Perfil (docs/features/profile.md). Funciones puras sobre el árbol de
 * `useExplorerTree` (carreras con sus materias y `sheetCount`).
 */

/**
 * @typedef {{id: string, name: string, color: string, subjects: number, sheets: number, share: number}} CareerStat
 *   `share`: hojas de la carrera sobre las de la carrera con más hojas (0..1), para la barra.
 */

/**
 * @param {Array<{id: string, name: string, color: string, subjects: Array<{sheetCount: number}>}>} careers
 * @returns {{careers: number, subjects: number, sheets: number, byCareer: CareerStat[]}}
 */
export function profileStats(careers) {
  const rows = careers.map((career) => ({
    id: career.id,
    name: career.name,
    color: career.color,
    subjects: career.subjects.length,
    sheets: career.subjects.reduce((sum, subject) => sum + subject.sheetCount, 0),
  }))
  const max = Math.max(0, ...rows.map((row) => row.sheets))
  const byCareer = rows
    .map((row) => ({ ...row, share: max > 0 ? row.sheets / max : 0 }))
    .sort((a, b) => b.sheets - a.sheets)
  return {
    careers: rows.length,
    subjects: rows.reduce((sum, row) => sum + row.subjects, 0),
    sheets: rows.reduce((sum, row) => sum + row.sheets, 0),
    byCareer,
  }
}

/**
 * Id corto para mostrar: `7f3a…c21e`.
 * @param {string|undefined} id
 * @returns {string}
 */
export function shortId(id) {
  if (!id) return ''
  return `${id.slice(0, 4)}…${id.slice(-4)}`
}

/**
 * Inicial del avatar.
 * @param {string|null|undefined} email
 * @returns {string}
 */
export function initialOf(email) {
  return email ? email.charAt(0).toUpperCase() : ''
}
