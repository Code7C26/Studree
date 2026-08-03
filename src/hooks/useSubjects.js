import { useCallback, useEffect, useState } from 'react'
import {
  getSubjects,
  createSubject as createSubjectSvc,
  updateSubject as updateSubjectSvc,
  deleteSubject as deleteSubjectSvc,
} from '../services/subjects.service'

/**
 * Estado + acciones de las materias de una carpeta.
 * @param {string} folderId
 */
export function useSubjects(folderId) {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setSubjects(getSubjects(folderId))
  }, [folderId])

  useEffect(() => {
    setLoading(true)
    refresh()
    setLoading(false)
  }, [refresh])

  const createSubject = useCallback(
    (data) => {
      createSubjectSvc({ ...data, folderId })
      refresh()
    },
    [folderId, refresh],
  )

  const updateSubject = useCallback(
    (id, updates) => {
      updateSubjectSvc(id, updates)
      refresh()
    },
    [refresh],
  )

  const removeSubject = useCallback(
    (id) => {
      deleteSubjectSvc(id)
      refresh()
    },
    [refresh],
  )

  return { subjects, loading, createSubject, updateSubject, removeSubject }
}
