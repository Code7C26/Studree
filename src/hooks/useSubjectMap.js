/**
 * Estado y acciones del canvas de materia: unidades + temas (con conteo de
 * hojas por tema). Ver docs/features/subject-map.md.
 */

import { useCallback, useEffect, useState } from 'react'
import { unitsService } from '../services/units.service.js'
import { topicsService } from '../services/topics.service.js'
import { sheetsService } from '../services/sheets.service.js'

/**
 * @typedef {import('../types/models.js').Topic & {sheetCount: number}} TopicWithCount
 * @typedef {import('../types/models.js').Unit & {topics: TopicWithCount[]}} UnitWithTopics
 */

/**
 * @param {string} subjectId
 * @returns {{
 *   units: UnitWithTopics[],
 *   loading: boolean,
 *   error: string|null,
 *   createUnit: (values: {name: string}) => Promise<string|null>,
 *   deleteUnit: (id: string) => Promise<string|null>,
 *   createTopic: (unitId: string, values: {name: string}) => Promise<string|null>,
 *   deleteTopic: (unitId: string, topicId: string) => Promise<string|null>,
 * }}
 */
export function useSubjectMap(subjectId) {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!subjectId) return
    setLoading(true)

    const { data: unitRows, error: unitsError } = await unitsService.list(subjectId)

    const unitsWithTopics = await Promise.all(
      (unitRows ?? []).map(async (unit) => {
        const { data: topicRows } = await topicsService.list(unit.id)
        return { ...unit, topics: topicRows ?? [] }
      }),
    )

    const allTopicIds = unitsWithTopics.flatMap((unit) => unit.topics.map((topic) => topic.id))
    const { data: counts } = await sheetsService.countByTopics(allTopicIds)

    setUnits(
      unitsWithTopics.map((unit) => ({
        ...unit,
        topics: unit.topics.map((topic) => ({ ...topic, sheetCount: counts?.get(topic.id) ?? 0 })),
      })),
    )
    setError(unitsError)
    setLoading(false)
  }, [subjectId])

  useEffect(() => {
    load()
  }, [load])

  const createUnit = useCallback(
    async (values) => {
      const position = units.length
      const { data, error: createError } = await unitsService.create({
        subject_id: subjectId,
        position,
        ...values,
      })
      if (createError) {
        setError(createError)
        return createError
      }
      setUnits((current) => [...current, { ...data, topics: [] }])
      setError(null)
      return null
    },
    [subjectId, units.length],
  )

  const deleteUnit = useCallback(
    async (id) => {
      const { error: removeError } = await unitsService.remove(id, subjectId)
      if (removeError) {
        setError(removeError)
        return removeError
      }
      setUnits((current) => current.filter((unit) => unit.id !== id))
      setError(null)
      return null
    },
    [subjectId],
  )

  const createTopic = useCallback(
    async (unitId, values) => {
      const unit = units.find((candidate) => candidate.id === unitId)
      const position = unit ? unit.topics.length : 0
      const { data, error: createError } = await topicsService.create({ unit_id: unitId, position, ...values })
      if (createError) {
        setError(createError)
        return createError
      }
      setUnits((current) =>
        current.map((candidate) =>
          candidate.id === unitId
            ? { ...candidate, topics: [...candidate.topics, { ...data, sheetCount: 0 }] }
            : candidate,
        ),
      )
      setError(null)
      return null
    },
    [units],
  )

  const deleteTopic = useCallback(async (unitId, topicId) => {
    const { error: removeError } = await topicsService.remove(topicId, unitId)
    if (removeError) {
      setError(removeError)
      return removeError
    }
    setUnits((current) =>
      current.map((unit) =>
        unit.id === unitId ? { ...unit, topics: unit.topics.filter((topic) => topic.id !== topicId) } : unit,
      ),
    )
    setError(null)
    return null
  }, [])

  return { units, loading, error, createUnit, deleteUnit, createTopic, deleteTopic }
}
