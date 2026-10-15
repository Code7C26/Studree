/**
 * Trae el árbol (con `content_md`) que necesita el export a Markdown.
 * Ver docs/features/markdown-export.md.
 *
 * Vive aparte de `useFolder`/`useExplorerTree` porque necesita el
 * contenido completo de cada hoja, no solo el título — traerlo siempre sería
 * desperdiciar red en el resto de la app.
 *
 * Jerarquía de 3 niveles (ADR-014): carrera → materia → hoja.
 */

import { useCallback, useState } from 'react'
import { careersService } from '../services/careers.service.js'
import { subjectsService } from '../services/subjects.service.js'
import { sheetsService } from '../services/sheets.service.js'

const EXPORT_SHEET_COLUMNS = 'id, subject_id, content_md, created_at, updated_at'

/** Lanza el error de un ServiceResult como excepción (lo atrapa `run`). */
function unwrap({ data, error }) {
  if (error) throw new Error(error)
  return data ?? []
}

/** @param {Object[]} rows @param {string} field */
function groupBy(rows, field) {
  const groups = new Map()
  for (const row of rows) {
    if (!groups.has(row[field])) groups.set(row[field], [])
    groups.get(row[field]).push(row)
  }
  return groups
}

/** @param {Object} sheet */
const toExportSheet = (sheet) => ({
  created_at: sheet.created_at,
  content_md: sheet.content_md,
  updated_at: sheet.updated_at,
})

/**
 * Materias con sus hojas, con UNA consulta de hojas (`IN`) para todas.
 * @param {import('../types/models.js').Subject[]} subjectRows
 * @returns {Promise<Array<{name: string, sheets: Array}>>}
 */
async function buildSubjectTrees(subjectRows) {
  const sheets = unwrap(
    await sheetsService.listByParents(
      subjectRows.map((subject) => subject.id),
      EXPORT_SHEET_COLUMNS,
    ),
  )
  const sheetsBySubject = groupBy(sheets, 'subject_id')
  return subjectRows.map((subject) => ({
    name: subject.name,
    sheets: (sheetsBySubject.get(subject.id) ?? []).map(toExportSheet),
  }))
}

/** @param {string} subjectId */
async function fetchSubjectTree(subjectId) {
  const { data: subject, error } = await subjectsService.get(subjectId)
  if (error) throw new Error(error)
  if (!subject) throw new Error('No se encontró la materia.')

  const { data: career } = await careersService.get(subject.career_id)
  const [tree] = await buildSubjectTrees([subject])
  return { ...tree, careerName: career?.name ?? '' }
}

/** @param {string} careerId */
async function fetchCareerTree(careerId) {
  const { data: career, error: careerError } = await careersService.get(careerId)
  if (careerError) throw new Error(careerError)
  if (!career) throw new Error('No se encontró la carrera.')

  const subjectRows = unwrap(await subjectsService.list(careerId))
  return { name: career.name, subjects: await buildSubjectTrees(subjectRows) }
}

/** Todas las carreras del usuario (RLS filtra), con 3 consultas en total. */
async function fetchAllTree() {
  const [careers, subjects] = await Promise.all([
    careersService.list().then(unwrap),
    subjectsService.list().then(unwrap),
  ])
  const subjectTrees = await buildSubjectTrees(subjects)
  const treesByCareer = groupBy(
    subjects.map((subject, index) => ({ career_id: subject.career_id, tree: subjectTrees[index] })),
    'career_id',
  )
  return careers.map((career) => ({
    name: career.name,
    subjects: (treesByCareer.get(career.id) ?? []).map((entry) => entry.tree),
  }))
}

/**
 * @returns {{
 *   loading: boolean,
 *   error: string|null,
 *   loadSubjectTree: (subjectId: string) => Promise<{name: string, careerName: string, sheets: Array}|null>,
 *   loadCareerTree: (careerId: string) => Promise<{name: string, subjects: Array}|null>,
 *   loadAllTree: () => Promise<Array<{name: string, subjects: Array}>|null>,
 * }}
 */
export function useExportTree() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = useCallback(async (fetcher) => {
    setLoading(true)
    setError(null)
    try {
      return await fetcher()
    } catch (err) {
      setError(err.message ?? 'No se pudo generar el export.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSubjectTree = useCallback((subjectId) => run(() => fetchSubjectTree(subjectId)), [run])
  const loadCareerTree = useCallback((careerId) => run(() => fetchCareerTree(careerId)), [run])
  const loadAllTree = useCallback(() => run(fetchAllTree), [run])

  return { loading, error, loadSubjectTree, loadCareerTree, loadAllTree }
}
