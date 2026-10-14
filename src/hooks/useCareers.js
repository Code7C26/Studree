/**
 * Estado y acciones de las carreras del usuario + estadísticas por carrera.
 * Ver docs/features/careers.md, docs/API_DOCS.md (flujo optimista) y docs/DB_SCHEMA.md.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { careersService } from '../services/careers.service.js'
import { subjectsService } from '../services/subjects.service.js'
import { computeCareerProgress } from '../lib/graph/subjectStatus.js'

/**
 * @typedef {{approved: number, total: number, percent: number}} CareerStats
 */

/**
 * @returns {{
 *   careers: import('../types/models.js').Career[],
 *   stats: Map<string, CareerStats>,
 *   totals: {careers: number, subjects: number, approved: number},
 *   loading: boolean,
 *   error: string|null,
 *   createCareer: (values: {name: string, color?: string, uses_prerequisites?: boolean}) => Promise<string|null>,
 *   updateCareer: (id: string, values: {name?: string, color?: string, uses_prerequisites?: boolean}) => Promise<string|null>,
 *   renameCareer: (id: string, name: string) => Promise<string|null>,
 *   deleteCareer: (id: string) => Promise<string|null>,
 *   reload: () => void
 * }}
 */
export function useCareers() {
  const [careers, setCareers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    // `onCached` pinta lo que haya en cache antes de que responda la red (ADR-007).
    const [{ data, error: loadError }, { data: subjectRows }] = await Promise.all([
      careersService.list(undefined, (cached) => {
        setCareers(cached)
        setLoading(false)
      }),
      // Una sola consulta para las estadísticas de TODAS las carreras (no una por carrera).
      subjectsService.list(),
    ])
    setCareers(data ?? [])
    setSubjects(subjectRows ?? [])
    setError(loadError)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const byCareer = new Map()
    for (const subject of subjects) {
      if (!byCareer.has(subject.career_id)) byCareer.set(subject.career_id, [])
      byCareer.get(subject.career_id).push(subject)
    }
    return new Map(careers.map((career) => [career.id, computeCareerProgress(byCareer.get(career.id) ?? [])]))
  }, [careers, subjects])

  const totals = useMemo(() => {
    let total = 0
    let approved = 0
    for (const value of stats.values()) {
      total += value.total
      approved += value.approved
    }
    return { careers: careers.length, subjects: total, approved }
  }, [careers.length, stats])

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

  const updateCareer = useCallback(async (id, values) => {
    const clean = { ...values }
    if (clean.name != null) clean.name = clean.name.trim()
    const { data, error: updateError } = await careersService.update(id, clean)
    if (updateError) {
      setError(updateError)
      return updateError
    }
    setCareers((current) => current.map((career) => (career.id === id ? data : career)))
    setError(null)
    return null
  }, [])

  const renameCareer = useCallback((id, name) => updateCareer(id, { name }), [updateCareer])

  const deleteCareer = useCallback(async (id) => {
    const { error: removeError } = await careersService.remove(id)
    if (removeError) {
      setError(removeError)
      return removeError
    }
    setCareers((current) => current.filter((career) => career.id !== id))
    setSubjects((current) => current.filter((subject) => subject.career_id !== id))
    setError(null)
    return null
  }, [])

  return { careers, stats, totals, loading, error, createCareer, updateCareer, renameCareer, deleteCareer, reload: load }
}
