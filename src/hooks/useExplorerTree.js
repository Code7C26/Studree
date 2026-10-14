/**
 * Árbol completo del workspace: Carrera → Materia → Unidad → Tema → Hoja.
 * Ver docs/features/navigation-shell.md.
 *
 * Se carga entero de una vez (no de a un nivel por click): para uso de estudio
 * personal el volumen de filas es chico, y así el mismo árbol le sirve tanto
 * al explorador (jerárquico) como al command palette (búsqueda plana), sin
 * pedirle datos a Supabase cada vez que se abre uno u otro.
 */

import { useCallback, useEffect, useState } from 'react'
import { careersService } from '../services/careers.service.js'
import { subjectsService } from '../services/subjects.service.js'
import { unitsService } from '../services/units.service.js'
import { topicsService } from '../services/topics.service.js'
import { sheetsService } from '../services/sheets.service.js'
import { onDataChanged } from '../services/dataEvents.js'

/** Service correcto por nivel, para el rename desde el explorador. */
const SERVICES_BY_TYPE = {
  career: careersService,
  subject: subjectsService,
  unit: unitsService,
  topic: topicsService,
  sheet: sheetsService,
}

/** Columna de FK al padre por nivel (`null` para carrera: no tiene padre). */
const PARENT_FIELD_BY_TYPE = {
  career: null,
  subject: 'career_id',
  unit: 'subject_id',
  topic: 'unit_id',
  sheet: 'topic_id',
}

/**
 * @typedef {Object} SearchEntry
 * @property {'subject'|'unit'|'topic'|'sheet'} type
 * @property {string} id
 * @property {string} name
 * @property {string[]} path - Nombres de los ancestros, del más alto al más cercano.
 * @property {string} careerId
 * @property {string} subjectId
 * @property {string} [content] - Solo en hojas: `content_md`, para el buscador de contenido (Fase 5).
 */

/**
 * @returns {{
 *   careers: Array<Object>,
 *   searchIndex: SearchEntry[],
 *   loading: boolean,
 *   error: string|null,
 *   reload: () => void,
 * }}
 */
export function useExplorerTree() {
  const [careers, setCareers] = useState([])
  const [searchIndex, setSearchIndex] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    // 5 consultas en total, una por nivel (RLS ya filtra por usuario), y el
    // árbol se arma en memoria. Antes era una consulta por cada carrera,
    // materia, unidad y tema (N+1), que con datos reales se volvía lento.
    const [careersResult, subjectsResult, unitsResult, topicsResult, sheetsResult] = await Promise.all([
      careersService.list(),
      subjectsService.list(),
      unitsService.list(),
      topicsService.list(),
      sheetsService.list(),
    ])

    if (careersResult.error) {
      setError(careersResult.error)
      setCareers([])
      setSearchIndex([])
      setLoading(false)
      return
    }

    /** Agrupa filas por su columna de FK al padre. */
    const groupBy = (rows, field) => {
      const groups = new Map()
      for (const row of rows ?? []) {
        if (!groups.has(row[field])) groups.set(row[field], [])
        groups.get(row[field]).push(row)
      }
      return groups
    }
    const subjectsByCareer = groupBy(subjectsResult.data, 'career_id')
    const unitsBySubject = groupBy(unitsResult.data, 'subject_id')
    const topicsByUnit = groupBy(topicsResult.data, 'unit_id')
    const sheetsByTopic = groupBy(sheetsResult.data, 'topic_id')

    const index = []
    const tree = (careersResult.data ?? []).map((career) => ({
      ...career,
      subjects: (subjectsByCareer.get(career.id) ?? []).map((subject) => {
        const base = { careerId: career.id, subjectId: subject.id }
        index.push({ type: 'subject', id: subject.id, name: subject.name, path: [career.name], ...base })

        return {
          ...subject,
          units: (unitsBySubject.get(subject.id) ?? []).map((unit) => {
            index.push({ type: 'unit', id: unit.id, name: unit.name, path: [career.name, subject.name], ...base })

            return {
              ...unit,
              topics: (topicsByUnit.get(unit.id) ?? []).map((topic) => {
                const topicPath = [career.name, subject.name, unit.name]
                index.push({ type: 'topic', id: topic.id, name: topic.name, path: topicPath, ...base })

                const sheets = sheetsByTopic.get(topic.id) ?? []
                for (const sheet of sheets) {
                  index.push({
                    type: 'sheet',
                    id: sheet.id,
                    name: sheet.title,
                    path: [...topicPath, topic.name],
                    content: sheet.content_md ?? '',
                    ...base,
                  })
                }
                return { ...topic, sheets }
              }),
            }
          }),
        }
      }),
    }))

    setCareers(tree)
    setSearchIndex(index)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Se re-arma cuando cualquier pantalla crea / renombra / borra algo
  // (services/dataEvents.js). Con debounce: crear una materia con su
  // correlativa, o borrar varias cosas seguidas, dispara una sola recarga.
  useEffect(() => {
    let timer = null
    const unsubscribe = onDataChanged(() => {
      clearTimeout(timer)
      timer = setTimeout(load, 300)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [load])

  /**
   * Renombra una carrera, materia, unidad, tema u hoja desde el explorador.
   * Las hojas usan `title`, el resto usa `name` (ver docs/DB_SCHEMA.md).
   *
   * @param {'career'|'subject'|'unit'|'topic'|'sheet'} type
   * @param {string} id
   * @param {string} name
   * @param {Object} node - El nodo del árbol (de ahí sale el `parentId`, sin recorrerlo de nuevo).
   * @returns {Promise<string|null>} Mensaje de error, o `null` si salió bien.
   */
  const renameEntity = useCallback(
    async (type, id, name, node) => {
      const trimmed = name.trim()
      if (!trimmed) return 'El nombre no puede estar vacío.'

      const service = SERVICES_BY_TYPE[type]
      const parentField = PARENT_FIELD_BY_TYPE[type]
      const parentId = parentField ? node[parentField] : undefined
      const values = type === 'sheet' ? { title: trimmed } : { name: trimmed }

      const { error: renameError } = await service.update(id, values, parentId)
      if (renameError) return renameError

      await load()
      return null
    },
    [load],
  )

  return { careers, searchIndex, loading, error, reload: load, renameEntity }
}
