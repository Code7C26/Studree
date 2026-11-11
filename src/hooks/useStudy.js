import { useCallback, useEffect, useState } from 'react'
import {
  deleteQuizAttempt,
  deleteSummary,
  getQuizAttempt,
  getSummary,
  listQuizAttempts,
  listSummaries,
} from '../services/study.service.js'

/**
 * Mi estudio: resúmenes y exámenes guardados del usuario, y borrado.
 * Ver docs/features/study.md.
 * @returns {{
 *   summaries: Object[], attempts: Object[], loading: boolean, error: string|null,
 *   remove: (kind: 'summary'|'quiz', id: string) => Promise<{error: string|null}>
 * }}
 */
export function useStudy() {
  const [summaries, setSummaries] = useState(/** @type {Object[]} */ ([]))
  const [attempts, setAttempts] = useState(/** @type {Object[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string|null} */ (null))

  useEffect(() => {
    let active = true
    Promise.all([listSummaries(), listQuizAttempts()]).then(([s, a]) => {
      if (!active) return
      setSummaries(s.data ?? [])
      setAttempts(a.data ?? [])
      setError(s.error ?? a.error ?? null)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const remove = useCallback(async (/** @type {'summary'|'quiz'} */ kind, /** @type {string} */ id) => {
    const { error: failure } = kind === 'summary' ? await deleteSummary(id) : await deleteQuizAttempt(id)
    if (failure) return { error: failure }
    if (kind === 'summary') setSummaries((rows) => rows.filter((r) => r.id !== id))
    else setAttempts((rows) => rows.filter((r) => r.id !== id))
    return { error: null }
  }, [])

  return { summaries, attempts, loading, error, remove }
}

/**
 * Un resumen o un examen por id (con su contenido), y su borrado.
 * `item === null` cuando no existe (borrado, o su materia está en la papelera).
 * @param {'summary'|'quiz'} kind
 * @param {string|undefined} id
 * @returns {{item: Object|null, loading: boolean, error: string|null, remove: () => Promise<{error: string|null}>}}
 */
export function useStudyItem(kind, id) {
  const [state, setState] = useState({
    item: /** @type {Object|null} */ (null),
    loading: true,
    error: /** @type {string|null} */ (null),
  })

  useEffect(() => {
    let active = true
    setState({ item: null, loading: true, error: null })
    if (!id) {
      setState({ item: null, loading: false, error: null })
      return undefined
    }
    const request = kind === 'summary' ? getSummary(id) : getQuizAttempt(id)
    request.then(({ data, error }) => {
      if (active) setState({ item: data ?? null, loading: false, error })
    })
    return () => {
      active = false
    }
  }, [kind, id])

  const remove = useCallback(async () => {
    if (!id) return { error: null }
    const { error } = kind === 'summary' ? await deleteSummary(id) : await deleteQuizAttempt(id)
    return { error }
  }, [kind, id])

  return { ...state, remove }
}
