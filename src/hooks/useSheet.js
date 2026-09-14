/**
 * Carga y autosave (con debounce) de UNA hoja. Ver docs/features/sheet-editor.md.
 *
 * El contenido se escribe en la cache local ANTES de mandarlo a Supabase
 * (optimista, ADR-007): si la red falla, el trabajo del usuario no se pierde,
 * y si el navegador se cierra de golpe, sobrevive para la próxima carga.
 * `syncStatus` refleja el viaje a Supabase — el guardado local es instantáneo
 * y no tiene un estado propio.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { sheetsService } from '../services/sheets.service.js'
import { cacheKey, readCache, writeCache } from '../services/cache.service.js'

const AUTOSAVE_DELAY_MS = 800

/**
 * @param {string} sheetId
 * @returns {{
 *   sheet: import('../types/models.js').Sheet|null,
 *   loading: boolean,
 *   error: string|null,
 *   syncStatus: 'idle'|'saving'|'saved'|'error',
 *   saveTitle: (title: string) => Promise<string|null>,
 *   updateContent: (markdown: string) => void,
 * }}
 */
export function useSheet(sheetId) {
  const [sheet, setSheet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncStatus, setSyncStatus] = useState('idle')
  const debounceRef = useRef(null)

  const load = useCallback(async () => {
    if (!sheetId) return
    setLoading(true)
    const { data, error: loadError } = await sheetsService.get(sheetId)

    if (data) {
      // El borrador local es la red de seguridad (ver docs): si hay uno y
      // difiere del servidor, gana el borrador — podría ser trabajo que no
      // llegó a guardarse antes de un cierre accidental.
      const draft = readCache(cacheKey('sheet', sheetId), null)
      setSheet(draft != null && draft !== data.content_md ? { ...data, content_md: draft } : data)
    } else {
      setSheet(null)
    }

    setError(data ? null : (loadError ?? 'No se encontró la hoja.'))
    setLoading(false)
  }, [sheetId])

  useEffect(() => {
    load()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [load])

  /** Guarda el título. Se llama al perder el foco, no en cada tecla. */
  const saveTitle = useCallback(
    async (title) => {
      if (!sheet || !title.trim() || title.trim() === sheet.title) return null
      setSyncStatus('saving')
      const { data, error: saveError } = await sheetsService.update(sheet.id, { title: title.trim() }, sheet.topic_id)
      if (saveError) {
        setSyncStatus('error')
        setError(saveError)
        return saveError
      }
      setSheet((current) => (current ? { ...current, title: data.title } : current))
      setSyncStatus('saved')
      setError(null)
      return null
    },
    [sheet],
  )

  /**
   * Guarda el contenido con debounce (~800ms sin teclear). El borrador local
   * se escribe YA, de forma síncrona; el viaje a Supabase espera el debounce.
   */
  const updateContent = useCallback(
    (markdown) => {
      if (!sheet) return
      writeCache(cacheKey('sheet', sheet.id), markdown)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        setSyncStatus('saving')
        const { error: saveError } = await sheetsService.saveContent(sheet.id, markdown)
        setSyncStatus(saveError ? 'error' : 'saved')
        setError(saveError ?? null)
      }, AUTOSAVE_DELAY_MS)
    },
    [sheet],
  )

  return { sheet, loading, error, syncStatus, saveTitle, updateContent }
}
