/**
 * Estado y acciones de las hojas de un tema.
 * Ver docs/features/subject-map.md.
 */

import { useCallback, useEffect, useState } from 'react'
import { sheetsService } from '../services/sheets.service.js'

/**
 * @param {string} topicId
 * @returns {{
 *   sheets: import('../types/models.js').Sheet[],
 *   loading: boolean,
 *   error: string|null,
 *   createSheet: (values: {title: string}) => Promise<import('../types/models.js').Sheet|null>,
 *   renameSheet: (id: string, title: string) => Promise<string|null>,
 *   deleteSheet: (id: string) => Promise<string|null>,
 * }}
 */
export function useSheets(topicId) {
  const [sheets, setSheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!topicId) return
    setLoading(true)
    const { data, error: loadError } = await sheetsService.list(topicId, (cached) => {
      setSheets(cached)
      setLoading(false)
    })
    setSheets(data ?? [])
    setError(loadError)
    setLoading(false)
  }, [topicId])

  useEffect(() => {
    load()
  }, [load])

  /**
   * Crea una hoja vacía. Devuelve la hoja creada (no un string de error) porque
   * el flujo típico es abrirla directamente en el editor apenas se crea.
   */
  const createSheet = useCallback(
    async (values) => {
      const position = sheets.length
      const { data, error: createError } = await sheetsService.create({
        topic_id: topicId,
        position,
        ...values,
      })
      if (createError) {
        setError(createError)
        return null
      }
      setSheets((current) => [...current, data])
      setError(null)
      return data
    },
    [topicId, sheets.length],
  )

  const renameSheet = useCallback(
    async (id, title) => {
      const { data, error: updateError } = await sheetsService.update(id, { title: title.trim() }, topicId)
      if (updateError) {
        setError(updateError)
        return updateError
      }
      setSheets((current) => current.map((sheet) => (sheet.id === id ? data : sheet)))
      setError(null)
      return null
    },
    [topicId],
  )

  const deleteSheet = useCallback(
    async (id) => {
      const { error: removeError } = await sheetsService.remove(id, topicId)
      if (removeError) {
        setError(removeError)
        return removeError
      }
      setSheets((current) => current.filter((sheet) => sheet.id !== id))
      setError(null)
      return null
    },
    [topicId],
  )

  return { sheets, loading, error, createSheet, renameSheet, deleteSheet }
}
