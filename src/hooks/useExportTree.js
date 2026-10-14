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

/**
 * Arma el árbol de export de varias materias con 3 consultas en total
 * (unidades, temas y hojas, cada una con `IN`), no una por unidad/tema.
 *
 * @param {import('../types/models.js').Subject[]} subjectRows
 * @returns {Promise<Array<{name: string, units: Array<Object>}>>}
 */
async function buildSubjectTrees(subjectRows) {
  const units = unwrap(await unitsService.listByParents(subjectRows.map((subject) => subject.id)))
  const topics = unwrap(await topicsService.listByParents(units.map((unit) => unit.id)))
  const sheets = unwrap(
    await sheetsService.listByParents(
      topics.map((topic) => topic.id),
      'id, topic_id, title, content_md, updated_at, position',
    ),
  )

  const unitsBySubject = groupBy(units, 'subject_id')
  const topicsByUnit = groupBy(topics, 'unit_id')
  const sheetsByTopic = groupBy(sheets, 'topic_id')

  return subjectRows.map((subject) => ({
    name: subject.name,
    units: (unitsBySubject.get(subject.id) ?? []).map((unit) => ({
      name: unit.name,
      topics: (topicsByUnit.get(unit.id) ?? []).map((topic) => ({
        name: topic.name,
        sheets: (sheetsByTopic.get(topic.id) ?? []).map((sheet) => ({
          title: sheet.title,
          content_md: sheet.content_md,
          updated_at: sheet.updated_at,
        })),
      })),
    })),
  }))
}

/** @param {string} subjectId */
async function fetchSubjectTree(subjectId) {
  const { data: subject, error } = await subjectsService.get(subjectId)
  if (error) throw new Error(error)
  if (!subject) throw new Error('No se encontró la materia.')

  const [tree] = await buildSubjectTrees([subject])
  return tree
}

/** @param {string} careerId */
async function fetchCareerTree(careerId) {
  const { data: career, error: careerError } = await careersService.get(careerId)
  if (careerError) throw new Error(careerError)
  if (!career) throw new Error('No se encontró la carrera.')

  const subjectRows = unwrap(await subjectsService.list(careerId))
  return { name: career.name, subjects: await buildSubjectTrees(subjectRows) }
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
