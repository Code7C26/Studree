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

/**
 * Opciones del filtro "Materia": las de resúmenes y exámenes juntas, y si la
 * materia pedida por la URL no está entre ellas, una opción "Esta materia"
 * para que el selector refleje el filtro activo.
 * @param {Array<Parameters<typeof subjectOptions>[0][number]>} summaries
 * @param {Array<Parameters<typeof subjectOptions>[0][number]>} attempts
 * @param {string|null} activeId
 * @returns {Array<{id: string, name: string}>}
 */
export function filterOptions(summaries, attempts, activeId) {
  const options = subjectOptions([...(summaries ?? []), ...(attempts ?? [])])
  if (activeId && !options.some((o) => o.id === activeId)) options.push({ id: activeId, name: 'Esta materia' })
  return options
}

const SCOPE_FALLBACK = { sheet: 'una hoja', subject: 'una materia', career: 'toda la carrera', all: 'todas mis materias' }

/**
 * Título para mostrar de un examen. Los anteriores a la migración 0009 no lo
 * tienen: se arma uno según el alcance.
 * @param {{title?: string|null, scope_type?: string|null}} row
 * @returns {string}
 */
export function itemTitle(row) {
  const title = String(row?.title ?? '').trim()
  if (title) return title
  const where = SCOPE_FALLBACK[/** @type {keyof typeof SCOPE_FALLBACK} */ (row?.scope_type ?? '')]
  return where ? `Examen anterior · ${where}` : 'Examen anterior'
}
