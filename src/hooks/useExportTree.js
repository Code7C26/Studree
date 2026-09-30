/**
 * Trae el árbol completo (con `content_md`) que necesita el export a
 * Markdown (Fase 7.6, ver docs/features/markdown-export.md).
 *
 * Vive aparte de `useSubjectMap`/`useExplorerTree` porque necesita el
 * contenido completo de cada hoja, no solo el conteo o el nombre — traerlo
 * siempre sería desperdiciar red en el resto de la app.
 */

import { useCallback, useState } from 'react'
import { careersService } from '../services/careers.service.js'
import { subjectsService } from '../services/subjects.service.js'
import { unitsService } from '../services/units.service.js'
import { topicsService } from '../services/topics.service.js'
import { sheetsService } from '../services/sheets.service.js'

/**
 * @param {string} subjectId
 * @param {import('../types/models.js').Subject} [subjectRow] - Si ya se tiene la fila, evita un `get` extra.
 */
async function fetchSubjectTree(subjectId, subjectRow) {
  let subject = subjectRow
  if (!subject) {
    const { data, error } = await subjectsService.get(subjectId)
    if (error) throw new Error(error)
    if (!data) throw new Error('No se encontró la materia.')
    subject = data
  }

  const { data: unitRows, error: unitsError } = await unitsService.list(subjectId)
  if (unitsError) throw new Error(unitsError)

  const units = await Promise.all(
    (unitRows ?? []).map(async (unit) => {
      const { data: topicRows, error: topicsError } = await topicsService.list(unit.id)
      if (topicsError) throw new Error(topicsError)

      const topics = await Promise.all(
        (topicRows ?? []).map(async (topic) => {
          const { data: sheetRows, error: sheetsError } = await sheetsService.list(topic.id)
          if (sheetsError) throw new Error(sheetsError)

          return {
            name: topic.name,
            sheets: (sheetRows ?? []).map((sheet) => ({
              title: sheet.title,
              content_md: sheet.content_md,
              updated_at: sheet.updated_at,
            })),
          }
        }),
      )

      return { name: unit.name, topics }
    }),
  )

  return { name: subject.name, units }
}

/** @param {string} careerId */
async function fetchCareerTree(careerId) {
  const { data: career, error: careerError } = await careersService.get(careerId)
  if (careerError) throw new Error(careerError)
  if (!career) throw new Error('No se encontró la carrera.')

  const { data: subjectRows, error: subjectsError } = await subjectsService.list(careerId)
  if (subjectsError) throw new Error(subjectsError)

  const subjects = await Promise.all((subjectRows ?? []).map((subject) => fetchSubjectTree(subject.id, subject)))

  return { name: career.name, subjects }
}

/**
 * @returns {{
 *   loading: boolean,
 *   error: string|null,
 *   loadSubjectTree: (subjectId: string) => Promise<Object|null>,
 *   loadCareerTree: (careerId: string) => Promise<Object|null>,
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

  return { loading, error, loadSubjectTree, loadCareerTree }
}
