/**
 * Estado y acciones del canvas de carrera: la carrera, sus materias y sus
 * correlativas, más el layout manual (ADR-012) y el modo sin correlativas
 * (ADR-013). Ver docs/API_DOCS.md (flujo optimista) y docs/features/career-map.md.
 */

import { useCallback, useEffect, useState } from 'react'
import { careersService } from '../services/careers.service.js'
import { subjectsService } from '../services/subjects.service.js'
import { prerequisitesService } from '../services/prerequisites.service.js'
import { PREREQUISITE_KINDS } from '../constants/prerequisiteKinds.js'

/**
 * @typedef {Object} CreateSubjectValues
 * @property {string} name
 * @property {{x: number, y: number}|null} [position] - null = la posiciona dagre.
 * @property {string|null} [requiresId] - Si viene, la nueva materia nace con esa
 *   correlativa (para cursar). Es el "+" del nodo, estilo n8n.
 */

/**
 * @param {string} careerId
 * @returns {{
 *   career: import('../types/models.js').Career|null,
 *   careerError: string|null,
 *   usesPrerequisites: boolean,
 *   subjects: import('../types/models.js').Subject[],
 *   prerequisites: import('../types/models.js').Prerequisite[],
 *   loading: boolean,
 *   error: string|null,
 *   clearError: () => void,
 *   updateCareer: (values: {uses_prerequisites?: boolean}) => Promise<string|null>,
 *   createSubject: (values: CreateSubjectValues) => Promise<string|null>,
 *   deleteSubject: (id: string) => Promise<string|null>,
 *   setSubjectStatus: (id: string, status: import('../types/models.js').SubjectStatus) => Promise<string|null>,
 *   addPrerequisite: (values: {subject_id: string, requires_id: string, kind: import('../types/models.js').PrerequisiteKind}) => Promise<string|null>,
 *   removePrerequisite: (id: string) => Promise<string|null>,
 *   moveSubjects: (moves: Array<{id: string, x: number, y: number}>) => Promise<string|null>,
 *   resetLayout: () => Promise<string|null>,
 * }}
 */
export function useCareerMap(careerId) {
  const [career, setCareer] = useState(null)
  const [careerError, setCareerError] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [prerequisites, setPrerequisites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!careerId) return
    setLoading(true)

    const [{ data: careerRow, error: getError }, { data: subjectRows, error: subjectsError }] = await Promise.all([
      careersService.get(careerId),
      subjectsService.list(careerId),
    ])
    const ids = (subjectRows ?? []).map((subject) => subject.id)
    const { data: prereqRows, error: prereqError } = await prerequisitesService.listForSubjects(ids)

    setCareer(careerRow)
    setCareerError(careerRow ? null : (getError ?? 'No se encontró la carrera.'))
    setSubjects(subjectRows ?? [])
    setPrerequisites(prereqRows ?? [])
    setError(subjectsError ?? prereqError)
    setLoading(false)
  }, [careerId])

  useEffect(() => {
    load()
  }, [load])

  // Carreras previas a la migración 0002 no traen la columna: se comportan como antes (con correlativas).
  const usesPrerequisites = career?.uses_prerequisites !== false

  /** Registra el error y lo devuelve, para el patrón `return fail(x)`. */
  const fail = useCallback((message) => {
    setError(message)
    return message
  }, [])

  const updateCareer = useCallback(
    async (values) => {
      const { data, error: updateError } = await careersService.update(careerId, values)
      if (updateError) return fail(updateError)
      setCareer(data)
      setError(null)
      return null
    },
    [careerId, fail],
  )

  const createSubject = useCallback(
    async ({ name, position = null, requiresId = null }) => {
      const { data, error: createError } = await subjectsService.create({
        career_id: careerId,
        position: subjects.length,
        name,
        pos_x: position?.x ?? null,
        pos_y: position?.y ?? null,
      })
      if (createError) return fail(createError)
      setSubjects((current) => [...current, data])

      if (requiresId && usesPrerequisites) {
        // Materia recién creada: no tiene correlativas, así que no puede cerrar un ciclo.
        const { data: prereq, error: prereqError } = await prerequisitesService.add({
          subject_id: data.id,
          requires_id: requiresId,
          kind: PREREQUISITE_KINDS.cursar,
          existing: prerequisites,
          namesById: new Map(),
        })
        if (prereqError) return fail(prereqError)
        setPrerequisites((current) => [...current, prereq])
      }

      setError(null)
      return null
    },
    [careerId, subjects.length, usesPrerequisites, prerequisites, fail],
  )

  const deleteSubject = useCallback(
    async (id) => {
      const { error: removeError } = await subjectsService.remove(id, careerId)
      if (removeError) return fail(removeError)
      setSubjects((current) => current.filter((subject) => subject.id !== id))
      // La base borra en cascada las correlativas de esa materia; se refleja acá también.
      setPrerequisites((current) => current.filter((p) => p.subject_id !== id && p.requires_id !== id))
      setError(null)
      return null
    },
    [careerId, fail],
  )

  const setSubjectStatus = useCallback(
    async (id, status) => {
      const { data, error: updateError } = await subjectsService.setStatus(id, status, careerId)
      if (updateError) return fail(updateError)
      setSubjects((current) => current.map((subject) => (subject.id === id ? data : subject)))
      setError(null)
      return null
    },
    [careerId, fail],
  )

  const addPrerequisite = useCallback(
    async ({ subject_id, requires_id, kind }) => {
      const namesById = new Map(subjects.map((subject) => [subject.id, subject.name]))
      const { data, error: addError } = await prerequisitesService.add({
        subject_id,
        requires_id,
        kind,
        existing: prerequisites,
        namesById,
      })
      if (addError) return fail(addError)
      setPrerequisites((current) => [...current, data])
      setError(null)
      return null
    },
    [subjects, prerequisites, fail],
  )

  const removePrerequisite = useCallback(
    async (id) => {
      const { error: removeError } = await prerequisitesService.remove(id)
      if (removeError) return fail(removeError)
      setPrerequisites((current) => current.filter((p) => p.id !== id))
      setError(null)
      return null
    },
    [fail],
  )

  /**
   * Guarda posiciones manuales (ADR-012). Optimista: el nodo queda donde se
   * soltó al instante; si Supabase falla, se recarga lo que hay en la base.
   */
  const moveSubjects = useCallback(
    async (moves) => {
      if (moves.length === 0) return null
      const byId = new Map(moves.map((move) => [move.id, move]))
      setSubjects((current) =>
        current.map((subject) =>
          byId.has(subject.id) ? { ...subject, pos_x: byId.get(subject.id).x, pos_y: byId.get(subject.id).y } : subject,
        ),
      )

      const results = await Promise.all(
        moves.map((move) => subjectsService.savePosition(move.id, { x: move.x, y: move.y }, careerId)),
      )
      const failed = results.find((result) => result.error)
      if (failed) {
        await load()
        return fail(failed.error)
      }
      return null
    },
    [careerId, load, fail],
  )

  /** "Reordenar": borra las posiciones manuales y vuelve al auto-layout. */
  const resetLayout = useCallback(async () => {
    const { error: clearError } = await subjectsService.clearPositions([careerId])
    if (clearError) return fail(clearError)
    setSubjects((current) => current.map((subject) => ({ ...subject, pos_x: null, pos_y: null })))
    setError(null)
    return null
  }, [careerId, fail])

  const clearError = useCallback(() => setError(null), [])

  return {
    career,
    careerError,
    usesPrerequisites,
    subjects,
    prerequisites,
    loading,
    error,
    clearError,
    updateCareer,
    createSubject,
    deleteSubject,
    setSubjectStatus,
    addPrerequisite,
    removePrerequisite,
    moveSubjects,
    resetLayout,
  }
}
