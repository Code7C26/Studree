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

/**
 * @typedef {Object} SearchEntry
 * @property {'subject'|'unit'|'topic'|'sheet'} type
 * @property {string} id
 * @property {string} name
 * @property {string[]} path - Nombres de los ancestros, del más alto al más cercano.
 * @property {string} careerId
 * @property {string} subjectId
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
    const index = []

    const { data: careerRows, error: careersError } = await careersService.list()
    if (careersError) {
      setError(careersError)
      setCareers([])
      setSearchIndex([])
      setLoading(false)
      return
    }

    const tree = await Promise.all(
      (careerRows ?? []).map(async (career) => {
        const { data: subjectRows } = await subjectsService.list(career.id)

        const subjects = await Promise.all(
          (subjectRows ?? []).map(async (subject) => {
            index.push({
              type: 'subject',
              id: subject.id,
              name: subject.name,
              path: [career.name],
              careerId: career.id,
              subjectId: subject.id,
            })

            const { data: unitRows } = await unitsService.list(subject.id)

            const units = await Promise.all(
              (unitRows ?? []).map(async (unit) => {
                index.push({
                  type: 'unit',
                  id: unit.id,
                  name: unit.name,
                  path: [career.name, subject.name],
                  careerId: career.id,
                  subjectId: subject.id,
                })

                const { data: topicRows } = await topicsService.list(unit.id)

                const topics = await Promise.all(
                  (topicRows ?? []).map(async (topic) => {
                    index.push({
                      type: 'topic',
                      id: topic.id,
                      name: topic.name,
                      path: [career.name, subject.name, unit.name],
                      careerId: career.id,
                      subjectId: subject.id,
                    })

                    const { data: sheetRows } = await sheetsService.list(topic.id)

                    for (const sheet of sheetRows ?? []) {
                      index.push({
                        type: 'sheet',
                        id: sheet.id,
                        name: sheet.title,
                        path: [career.name, subject.name, unit.name, topic.name],
                        careerId: career.id,
                        subjectId: subject.id,
                      })
                    }

                    return { ...topic, sheets: sheetRows ?? [] }
                  }),
                )

                return { ...unit, topics }
              }),
            )

            return { ...subject, units }
          }),
        )

        return { ...career, subjects }
      }),
    )

    setCareers(tree)
    setSearchIndex(index)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { careers, searchIndex, loading, error, reload: load }
}
