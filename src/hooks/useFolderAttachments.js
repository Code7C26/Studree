/**
 * Adjuntos de TODAS las hojas de una carpeta, con una sola consulta (`IN`).
 * Ver docs/features/attachments.md.
 */

import { useCallback, useEffect, useState } from 'react'
import { attachmentsService } from '../services/attachments.service.js'

/** @param {import('../types/models.js').Attachment[]} rows */
function groupBySheet(rows) {
  const map = new Map()
  for (const row of rows) {
    if (!map.has(row.sheet_id)) map.set(row.sheet_id, [])
    map.get(row.sheet_id).push(row)
  }
  return map
}

/**
 * @param {string[]} sheetIds - Solo hojas reales (las locales no tienen adjuntos).
 * @returns {{
 *   bySheet: Map<string, import('../types/models.js').Attachment[]>,
 *   error: string|null,
 *   clearError: () => void,
 *   upload: (sheetId: string, file: File, options?: {id?: string}) => Promise<{error: string|null}>,
 *   remove: (attachment: import('../types/models.js').Attachment) => Promise<string|null>,
 *   resolveUrl: (id: string) => Promise<string|null>,
 *   isUploading: (id: string) => boolean,
 *   open: (id: string) => Promise<void>,
 * }}
 */
export function useFolderAttachments(sheetIds) {
  const [bySheet, setBySheet] = useState(() => new Map())
  const [error, setError] = useState(null)
  const idsKey = sheetIds.join(',')

  useEffect(() => {
    let alive = true
    const ids = idsKey ? idsKey.split(',') : []
    attachmentsService.listBySheets(ids).then(({ data, error: listError }) => {
      if (!alive) return
      // Se mezcla en vez de reemplazar: si la hoja recién se creó con el primer adjunto, esta
      // consulta puede resolverse DESPUÉS de la subida y no trae el adjunto nuevo. Por cada hoja
      // se usan las filas traídas, pero se conservan las ya en estado que la consulta no incluye.
      setBySheet((current) => {
        const fetched = groupBySheet(data)
        for (const [sheetId, rows] of fetched) {
          const known = new Set(rows.map((row) => row.id))
          const extra = (current.get(sheetId) ?? []).filter((row) => !known.has(row.id))
          if (extra.length) fetched.set(sheetId, [...rows, ...extra])
        }
        for (const [sheetId, rows] of current) {
          if (!fetched.has(sheetId) && ids.includes(sheetId) && rows.length) fetched.set(sheetId, rows)
        }
        return fetched
      })
      if (listError) setError(listError)
    })
    return () => {
      alive = false
    }
  }, [idsKey])

  // Sin `async`: el service registra la subida como pendiente en el mismo tick
  // (el editor inserta la referencia justo después).
  const upload = useCallback((sheetId, file, options) => {
    return attachmentsService.upload(sheetId, file, options).then(({ data, error: uploadError }) => {
      if (uploadError) {
        setError(uploadError)
        return { error: uploadError }
      }
      setBySheet((current) => new Map(current).set(sheetId, [...(current.get(sheetId) ?? []), data]))
      return { error: null }
    })
  }, [])

  const remove = useCallback(async (attachment) => {
    const { error: removeError } = await attachmentsService.remove(attachment)
    if (removeError) {
      setError(removeError)
      return removeError
    }
    setBySheet((current) =>
      new Map(current).set(
        attachment.sheet_id,
        (current.get(attachment.sheet_id) ?? []).filter((candidate) => candidate.id !== attachment.id),
      ),
    )
    return null
  }, [])

  const open = useCallback(async (id) => {
    const url = await attachmentsService.signedUrl(id)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
    else setError('Ese adjunto ya no está disponible.')
  }, [])

  const resolveUrl = useCallback((id) => attachmentsService.signedUrl(id), [])
  const isUploading = useCallback((id) => attachmentsService.isUploading(id), [])
  const clearError = useCallback(() => setError(null), [])

  return { bySheet, error, clearError, upload, remove, resolveUrl, isUploading, open }
}
