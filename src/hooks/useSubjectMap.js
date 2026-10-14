/**
 * Estado y acciones del canvas de materia: la materia (nodo raíz), sus
 * unidades y temas (con conteo de hojas por tema) y el layout manual (ADR-012).
 * Ver docs/features/subject-map.md.
 */

import { useCallback, useEffect, useState } from 'react'
import { subjectsService } from '../services/subjects.service.js'
import { unitsService } from '../services/units.service.js'
import { topicsService } from '../services/topics.service.js'
import { sheetsService } from '../services/sheets.service.js'

/**
 * @typedef {import('../types/models.js').Topic & {sheetCount: number}} TopicWithCount
 * @typedef {import('../types/models.js').Unit & {topics: TopicWithCount[]}} UnitWithTopics
 * @typedef {{nodeId: string, x: number, y: number}} NodeMove - `nodeId` con prefijo `subject:`/`unit:`/`topic:`.
 */

/**
 * @param {string} subjectId
 * @returns {{
 *   subject: import('../types/models.js').Subject|null,
 *   subjectError: string|null,
 *   units: UnitWithTopics[],
 *   loading: boolean,
 *   error: string|null,
 *   clearError: () => void,
 *   createUnit: (values: {name: string, position?: {x: number, y: number}|null}) => Promise<string|null>,
 *   deleteUnit: (id: string) => Promise<string|null>,
 *   createTopic: (unitId: string, values: {name: string, position?: {x: number, y: number}|null}) => Promise<string|null>,
 *   deleteTopic: (unitId: string, topicId: string) => Promise<string|null>,
 *   moveNodes: (moves: NodeMove[]) => Promise<string|null>,
 *   resetLayout: () => Promise<string|null>,
 * }}
 */
export function useSubjectMap(subjectId) {
  const [subject, setSubject] = useState(null)
  const [subjectError, setSubjectError] = useState(null)
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!subjectId) return
    setLoading(true)

    const [{ data: subjectRow, error: getError }, { data: unitRows, error: unitsError }] = await Promise.all([
      subjectsService.get(subjectId),
      unitsService.list(subjectId),
    ])

    // Una consulta para TODOS los temas y otra para los conteos (no una por unidad/tema).
    const unitIds = (unitRows ?? []).map((unit) => unit.id)
    const { data: topicRows, error: topicsError } = await topicsService.listByParents(unitIds)
    const { data: counts } = await sheetsService.countByTopics((topicRows ?? []).map((topic) => topic.id))

    const topicsByUnit = new Map()
    for (const topic of topicRows ?? []) {
      if (!topicsByUnit.has(topic.unit_id)) topicsByUnit.set(topic.unit_id, [])
      topicsByUnit.get(topic.unit_id).push({ ...topic, sheetCount: counts?.get(topic.id) ?? 0 })
    }

    setSubject(subjectRow)
    setSubjectError(subjectRow ? null : (getError ?? 'No se encontró la materia.'))
    setUnits((unitRows ?? []).map((unit) => ({ ...unit, topics: topicsByUnit.get(unit.id) ?? [] })))
    setError(unitsError ?? topicsError)
    setLoading(false)
  }, [subjectId])

  useEffect(() => {
    load()
  }, [load])

  const fail = useCallback((message) => {
    setError(message)
    return message
  }, [])

  const createUnit = useCallback(
    async ({ name, position = null }) => {
      const { data, error: createError } = await unitsService.create({
        subject_id: subjectId,
        position: units.length,
        name,
        pos_x: position?.x ?? null,
        pos_y: position?.y ?? null,
      })
      if (createError) return fail(createError)
      setUnits((current) => [...current, { ...data, topics: [] }])
      setError(null)
      return null
    },
    [subjectId, units.length, fail],
  )

  const deleteUnit = useCallback(
    async (id) => {
      const { error: removeError } = await unitsService.remove(id, subjectId)
      if (removeError) return fail(removeError)
      setUnits((current) => current.filter((unit) => unit.id !== id))
      setError(null)
      return null
    },
    [subjectId, fail],
  )

  const createTopic = useCallback(
    async (unitId, { name, position = null }) => {
      const unit = units.find((candidate) => candidate.id === unitId)
      const { data, error: createError } = await topicsService.create({
        unit_id: unitId,
        position: unit ? unit.topics.length : 0,
        name,
        pos_x: position?.x ?? null,
        pos_y: position?.y ?? null,
      })
      if (createError) return fail(createError)
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
    [units, fail],
  )

  const deleteTopic = useCallback(
    async (unitId, topicId) => {
      const { error: removeError } = await topicsService.remove(topicId, unitId)
      if (removeError) return fail(removeError)
      setUnits((current) =>
        current.map((unit) =>
          unit.id === unitId ? { ...unit, topics: unit.topics.filter((topic) => topic.id !== topicId) } : unit,
        ),
      )
      setError(null)
      return null
    },
    [fail],
  )

  /**
   * Guarda posiciones manuales (ADR-012). Optimista; si Supabase falla, se
   * recarga lo que hay en la base.
   */
  const moveNodes = useCallback(
    async (moves) => {
      if (moves.length === 0) return null
      const byNodeId = new Map(moves.map((move) => [move.nodeId, move]))
      const pick = (prefix, id) => byNodeId.get(`${prefix}:${id}`)

      setSubject((current) => {
        const move = current && pick('subject', current.id)
        return move ? { ...current, map_x: move.x, map_y: move.y } : current
      })
      setUnits((current) =>
        current.map((unit) => {
          const unitMove = pick('unit', unit.id)
          return {
            ...unit,
            ...(unitMove ? { pos_x: unitMove.x, pos_y: unitMove.y } : {}),
            topics: unit.topics.map((topic) => {
              const topicMove = pick('topic', topic.id)
              return topicMove ? { ...topic, pos_x: topicMove.x, pos_y: topicMove.y } : topic
            }),
          }
        }),
      )

      const unitOfTopic = new Map(units.flatMap((unit) => unit.topics.map((topic) => [topic.id, unit.id])))
      const requests = moves.map(({ nodeId, x, y }) => {
        const [type, id] = nodeId.split(':')
        if (type === 'subject') return subjectsService.savePosition(id, { x, y }, subject?.career_id, ['map_x', 'map_y'])
        if (type === 'unit') return unitsService.savePosition(id, { x, y }, subjectId)
        return topicsService.savePosition(id, { x, y }, unitOfTopic.get(id))
      })

      const failed = (await Promise.all(requests)).find((result) => result.error)
      if (failed) {
        await load()
        return fail(failed.error)
      }
      return null
    },
    [units, subject?.career_id, subjectId, load, fail],
  )

  /** "Reordenar": borra todas las posiciones manuales del canvas de esta materia. */
  const resetLayout = useCallback(async () => {
    const unitIds = units.map((unit) => unit.id)
    const results = await Promise.all([
      subjectsService.update(subjectId, { map_x: null, map_y: null }, subject?.career_id, { silent: true }),
      unitsService.clearPositions([subjectId]),
      topicsService.clearPositions(unitIds),
    ])
    const failed = results.find((result) => result.error)
    if (failed) return fail(failed.error)

    setSubject((current) => (current ? { ...current, map_x: null, map_y: null } : current))
    setUnits((current) =>
      current.map((unit) => ({
        ...unit,
        pos_x: null,
        pos_y: null,
        topics: unit.topics.map((topic) => ({ ...topic, pos_x: null, pos_y: null })),
      })),
    )
    setError(null)
    return null
  }, [units, subjectId, subject?.career_id, fail])

  const clearError = useCallback(() => setError(null), [])

  return {
    subject,
    subjectError,
    units,
    loading,
    error,
    clearError,
    createUnit,
    deleteUnit,
    createTopic,
    deleteTopic,
    moveNodes,
    resetLayout,
  }
}
