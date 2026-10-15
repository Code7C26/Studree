/**
 * Dónde vive una hoja (su materia), para redirigir los links viejos
 * `/hojas/:id` a la carpeta (ADR-017). Ver docs/features/folder.md.
 */

import { useEffect, useState } from 'react'
import { sheetsService } from '../services/sheets.service.js'

/**
 * @param {string} sheetId
 * @returns {{location: {subjectId: string, sheetId: string}|null, error: string|null}}
 */
export function useSheetLocation(sheetId) {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLocation(null)
    setError(null)
    sheetsService.get(sheetId).then(({ data, error: getError }) => {
      if (cancelled) return
      if (data) setLocation({ subjectId: data.subject_id, sheetId: data.id })
      else setError(getError ?? 'Puede que se haya eliminado.')
    })
    return () => {
      cancelled = true
    }
  }, [sheetId])

  return { location, error }
}
