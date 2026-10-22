// Filas de "Mi estudio" (resúmenes y exámenes con su materia/carrera embebidas).
// Puro: sin React ni services.

/**
 * Descarta las filas de materias o carreras en la papelera, o cuyo embed
 * vino `null` aunque la fila apunte a una (RLS lo oculta o ya no existe).
 * @template {{subject_id?: string|null, subject?: {deleted_at?: string|null}|null, career_id?: string|null, career?: {deleted_at?: string|null}|null}} T
 * @param {T[]} rows
 * @returns {T[]}
 */
export function filterLiveStudyItems(rows) {
  return (rows ?? []).filter((r) => {
    if (r.subject_id && (!r.subject || r.subject.deleted_at)) return false
    if (r.career_id && (!r.career || r.career.deleted_at)) return false
    return true
  })
}

/**
 * Materias distintas de las filas, por nombre.
 * @param {Array<{subject?: {id?: string, name?: string}|null, subject_id?: string|null}>} rows
 * @returns {Array<{id: string, name: string}>}
 */
export function subjectOptions(rows) {
  /** @type {Map<string, string>} */
  const byId = new Map()
  for (const r of rows ?? []) {
    const id = r.subject_id ?? r.subject?.id
    if (id && r.subject?.name && !byId.has(id)) byId.set(id, r.subject.name)
  }
  return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

/**
 * @template {{subject_id?: string|null}} T
 * @param {T[]} rows
 * @param {string|null} subjectId
 * @returns {T[]}
 */
export function filterBySubject(rows, subjectId) {
  return subjectId ? rows.filter((r) => r.subject_id === subjectId) : rows
}
