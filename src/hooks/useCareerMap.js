/**
 * Estado y acciones del canvas de carrera: materias + correlativas.
 * Ver docs/API_DOCS.md (flujo optimista) y docs/features/career-map.md.
 */

import { useCallback, useEffect, useState } from 'react'
import { subjectsService } from '../services/subjects.service.js'
import { prerequisitesService } from '../services/prerequisites.service.js'

/**
 * @param {string} careerId
 * @returns {{
 *   subjects: import('../types/models.js').Subject[],
 *   prerequisites: import('../types/models.js').Prerequisite[],
 *   loading: boolean,
 *   error: string|null,
 *   createSubject: (values: {name: string}) => Promise<string|null>,
 *   deleteSubject: (id: string) => Promise<string|null>,
 *   setSubjectStatus: (id: string, status: import('../types/models.js').SubjectStatus) => Promise<string|null>,
 *   addPrerequisite: (values: {subject_id: string, requires_id: string, kind: import('../types/models.js').PrerequisiteKind}) => Promise<string|null>,
 *   removePrerequisite: (id: string) => Promise<string|null>,
 * }}
 */
export function useCareerMap(careerId) {
  const [subjects, setSubjects] = useState([])
  const [prerequisites, setPrerequisites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!careerId) return
    setLoading(true)

    const { data: subjectRows, error: subjectsError } = await subjectsService.list(careerId)
    const ids = (subjectRows ?? []).map((subject) => subject.id)
    const { data: prereqRows, error: prereqError } = await prerequisitesService.listForSubjects(ids)

    setSubjects(subjectRows ?? [])
    setPrerequisites(prereqRows ?? [])
    setError(subjectsError ?? prereqError)
    setLoading(false)
  }, [careerId])

  useEffect(() => {
    load()
  }, [load])

  const createSubject = useCallback(
    async (values) => {
      const position = subjects.length
      const { data, error: createError } = await subjectsService.create({
        career_id: careerId,
        position,
        ...values,
      })
      if (createError) {
        setError(createError)
        return createError
      }
      setSubjects((current) => [...current, data])
      setError(null)
      return null
    },
    [careerId, subjects.length],
  )

  const deleteSubject = useCallback(
    async (id) => {
      const { error: removeError } = await subjectsService.remove(id, careerId)
      if (removeError) {
        setError(removeError)
        return removeError
      }
      setSubjects((current) => current.filter((subject) => subject.id !== id))
      // La base borra en cascada las correlativas de esa materia; se refleja acá también.
      setPrerequisites((current) => current.filter((p) => p.subject_id !== id && p.requires_id !== id))
      setError(null)
      return null
    },
    [careerId],
  )

  const setSubjectStatus = useCallback(
    async (id, status) => {
      const { data, error: updateError } = await subjectsService.setStatus(id, status, careerId)
      if (updateError) {
        setError(updateError)
        return updateError
      }
      setSubjects((current) => current.map((subject) => (subject.id === id ? data : subject)))
      setError(null)
      return null
    },
    [careerId],
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
      if (addError) {
        setError(addError)
        return addError
      }
      setPrerequisites((current) => [...current, data])
      setError(null)
      return null
    },
    [subjects, prerequisites],
  )

  const removePrerequisite = useCallback(async (id) => {
    const { error: removeError } = await prerequisitesService.remove(id)
    if (removeError) {
      setError(removeError)
      return removeError
    }
    setPrerequisites((current) => current.filter((p) => p.id !== id))
    setError(null)
    return null
  }, [])

  return {
    subjects,
    prerequisites,
    loading,
    error,
    createSubject,
    deleteSubject,
    setSubjectStatus,
    addPrerequisite,
    removePrerequisite,
  }
}
