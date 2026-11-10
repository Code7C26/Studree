/**
 * Mazo de tarjetas de una materia (Fase 15). Ver docs/features/flashcards.md.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { flashcardsService } from '../services/flashcards.service.js'
import { dueCards } from '../lib/flashcards/srs.js'

/**
 * @param {string} subjectId
 * @returns {{
 *   cards: import('../types/models.js').Flashcard[],
 *   due: import('../types/models.js').Flashcard[],
 *   loading: boolean,
 *   busy: boolean,
 *   error: string|null,
 *   reload: () => Promise<void>,
 *   create: (values: {front: string, back: string, sheet_id?: string|null}) => Promise<boolean>,
 *   update: (id: string, values: {front?: string, back?: string}) => Promise<boolean>,
 *   remove: (id: string) => Promise<boolean>,
 *   review: (id: string, correct: boolean) => Promise<boolean>,
 *   clearError: () => void,
 * }}
 */
export function useFlashcards(subjectId) {
  const [cards, setCards] = useState(/** @type {import('../types/models.js').Flashcard[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(/** @type {string|null} */ (null))

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error: message } = await flashcardsService.listBySubject(subjectId)
    setCards(data)
    setError(message)
    setLoading(false)
  }, [subjectId])

  useEffect(() => {
    let active = true
    setLoading(true)
    flashcardsService.listBySubject(subjectId).then(({ data, error: message }) => {
      if (!active) return
      setCards(data)
      setError(message)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [subjectId])

  const create = useCallback(
    async (values) => {
      setBusy(true)
      const { data, error: message } = await flashcardsService.create({ subject_id: subjectId, ...values })
      setBusy(false)
      if (message) {
        setError(message)
        return false
      }
      setCards((current) => [...current, data])
      return true
    },
    [subjectId],
  )

  const update = useCallback(async (id, values) => {
    setBusy(true)
    const { data, error: message } = await flashcardsService.update(id, values)
    setBusy(false)
    if (message) {
      setError(message)
      return false
    }
    setCards((current) => current.map((card) => (card.id === id ? data : card)))
    return true
  }, [])

  const remove = useCallback(async (id) => {
    setBusy(true)
    const { error: message } = await flashcardsService.remove(id)
    setBusy(false)
    if (message) {
      setError(message)
      return false
    }
    setCards((current) => current.filter((card) => card.id !== id))
    return true
  }, [])

  const review = useCallback(async (id, correct) => {
    setBusy(true)
    const { data, error: message } = await flashcardsService.review(id, correct)
    setBusy(false)
    if (message) {
      setError(message)
      return false
    }
    setCards((current) => current.map((card) => (card.id === id ? data : card)))
    return true
  }, [])

  const due = useMemo(() => dueCards(cards), [cards])

  return { cards, due, loading, busy, error, reload, create, update, remove, review, clearError: useCallback(() => setError(null), []) }
}
