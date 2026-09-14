/**
 * Estado y acciones de las carreras del usuario.
 * Ver docs/API_DOCS.md (flujo optimista) y docs/DB_SCHEMA.md.
 */

import { useCallback, useEffect, useState } from 'react'
import { careersService } from '../services/careers.service.js'

/**
 * @returns {{
 *   careers: import('../types/models.js').Career[],
 *   loading: boolean,
 *   error: string|null,
 *   createCareer: (values: {name: string, color?: string}) => Promise<string|null>,
 *   renameCareer: (id: string, name: string) => Promise<string|null>,
 *   deleteCareer: (id: string) => Promise<string|null>,
 *   reload: () => void
 * }}
 */
export function useCareers() {
  const [careers, setCareers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    // `onCached` pinta lo que haya en cache antes de que responda la red (ADR-007).
    const { data, error: loadError } = await careersService.list(undefined, (cached) => {
      setCareers(cached)
      setLoading(false)
    })
    setCareers(data ?? [])
    setError(loadError)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createCareer = useCallback(async (values) => {
    const { data, error: createError } = await careersService.create(values)
    if (createError) {
      setError(createError)
      return createError
    }
    setCareers((current) => [...current, data])
    setError(null)
    return null
  }, [])

  const renameCareer = useCallback(async (id, name) => {
    const { data, error: updateError } = await careersService.update(id, { name: name.trim() })
    if (updateError) {
      setError(updateError)
      return updateError
    }
    setCareers((current) => current.map((career) => (career.id === id ? data : career)))
    setError(null)
    return null
  }, [])

  const deleteCareer = useCallback(async (id) => {
    const { error: removeError } = await careersService.remove(id)
    if (removeError) {
      setError(removeError)
      return removeError
    }
    setCareers((current) => current.filter((career) => career.id !== id))
    setError(null)
    return null
  }, [])

  return { careers, loading, error, createCareer, renameCareer, deleteCareer, reload: load }
}
