/**
 * Estado y acciones de las materias de una carrera.
 * Ver docs/API_DOCS.md (flujo optimista) y docs/features/career-map.md.
 */

import { useCallback, useEffect, useState } from 'react'
import { subjectsService } from '../services/subjects.service.js'

/**
 * @param {string} careerId
 * @returns {{
 *   subjects: import('../types/models.js').Subject[],
 *   loading: boolean,
 *   error: string|null,
 *   createSubject: (values: {name: string, color?: string}) => Promise<string|null>,
 *   setSubjectStatus: (id: string, status: import('../types/models.js').SubjectStatus) => Promise<string|null>,
 *   deleteSubject: (id: string) => Promise<string|null>,
 * }}
 */
export function useSubjects(careerId) {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!careerId) return
    setLoading(true)
    // `onCached` pinta lo que haya en cache antes de que responda la red (ADR-007).
    const { data, error: loadError } = await subjectsService.list(careerId, (cached) => {
      setSubjects(cached)
      setLoading(false)
    })
    setSubjects(data ?? [])
    setError(loadError)
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

  const deleteSubject = useCallback(
    async (id) => {
      const { error: removeError } = await subjectsService.remove(id, careerId)
      if (removeError) {
        setError(removeError)
        return removeError
      }
      setSubjects((current) => current.filter((subject) => subject.id !== id))
      setError(null)
      return null
    },
    [careerId],
  )

  return { subjects, loading, error, createSubject, setSubjectStatus, deleteSubject }
}
