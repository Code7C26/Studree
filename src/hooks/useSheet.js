/**
 * Carga y autosave (con debounce) de UNA hoja. Ver docs/features/sheet-editor.md.
 *
 * Borrador local (red de seguridad, ADR-007): cada tecla se escribe YA en la
 * cache como `{ content, baseUpdatedAt }`, donde `baseUpdatedAt` es el
 * `updated_at` de la versión del servidor sobre la que se escribió. Al abrir la
 * hoja, el borrador SOLO gana si el servidor no cambió desde entonces
 * (`baseUpdatedAt === updated_at`); si alguien guardó otra cosa después (otro
 * dispositivo), el borrador se descarta en vez de pisar ese trabajo. Después
 * de un guardado exitoso el borrador se borra.
 *
 * Si se sale de la hoja (desmontar / cerrar la pestaña) con un guardado
 * pendiente, se manda enseguida en vez de perderlo con el debounce.
 *
 * `syncStatus` refleja el viaje a Supabase — el guardado local es instantáneo.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { sheetsService } from '../services/sheets.service.js'
import { cacheKey, clearCache, readCache, writeCache } from '../services/cache.service.js'

const AUTOSAVE_DELAY_MS = 800

/**
 * @typedef {{content: string, baseUpdatedAt: string}} SheetDraft
 */

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
  /** Markdown que todavía no llegó a Supabase (`null` = nada pendiente). */
  const pendingRef = useRef(null)
  /** `updated_at` de la última versión conocida del servidor. */
  const baseRef = useRef(null)
  /** Para no hacer setState después de desmontar (el flush final sigue viajando). */
  const mountedRef = useRef(true)

  const draftKey = cacheKey('sheet', sheetId)

  /** Manda YA lo pendiente a Supabase. */
  const flush = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const markdown = pendingRef.current
    if (markdown == null) return
    pendingRef.current = null

    if (mountedRef.current) setSyncStatus('saving')
    const { data, error: saveError } = await sheetsService.saveContent(sheetId, markdown)

    if (saveError) {
      // Lo pendiente sigue en el borrador local: se reintenta en la próxima tecla o al reabrir.
      if (mountedRef.current) {
        setSyncStatus('error')
        setError(saveError)
      }
      return
    }

    baseRef.current = data.updated_at
    const draft = readCache(draftKey, null)
    if (draft?.content === markdown) clearCache(draftKey)
    else if (draft) writeCache(draftKey, { ...draft, baseUpdatedAt: data.updated_at })

    if (mountedRef.current) {
      setSheet((current) => (current ? { ...current, updated_at: data.updated_at } : current))
      setSyncStatus('saved')
      setError(null)
    }
  }, [sheetId, draftKey])

  const load = useCallback(async () => {
    if (!sheetId) return
    setLoading(true)
    const { data, error: loadError } = await sheetsService.get(sheetId)

    if (data) {
      baseRef.current = data.updated_at
      /** @type {SheetDraft|string|null} */
      const draft = readCache(draftKey, null)
      // Los borradores del formato viejo (string sin base) no se pueden validar: se descartan.
      const usable =
        draft != null &&
        typeof draft === 'object' &&
        draft.baseUpdatedAt === data.updated_at &&
        draft.content !== data.content_md

      if (usable) {
        // Trabajo local que no llegó al servidor (cierre accidental, red caída): se recupera y se reenvía.
        setSheet({ ...data, content_md: draft.content })
        pendingRef.current = draft.content
        flush()
      } else {
        if (draft != null) clearCache(draftKey)
        setSheet(data)
      }
    } else {
      setSheet(null)
    }

    setError(data ? null : (loadError ?? 'No se encontró la hoja.'))
    setLoading(false)
  }, [sheetId, draftKey, flush])

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => {
      mountedRef.current = false
      flush()
    }
  }, [load, flush])

  // Cerrar la pestaña o recargar: mandar lo pendiente sin esperar el debounce.
  useEffect(() => {
    const onPageHide = () => {
      flush()
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [flush])

  /** Guarda el título. Se llama al perder el foco, no en cada tecla. */
  const saveTitle = useCallback(
    async (title) => {
      if (!sheet || !title.trim() || title.trim() === sheet.title) return null
      setSyncStatus('saving')
      const { data, error: saveError } = await sheetsService.update(sheet.id, { title: title.trim() }, sheet.subject_id)
      if (saveError) {
        setSyncStatus('error')
        setError(saveError)
        return saveError
      }
      baseRef.current = data.updated_at
      setSheet((current) => (current ? { ...current, title: data.title, updated_at: data.updated_at } : current))
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
      writeCache(draftKey, { content: markdown, baseUpdatedAt: baseRef.current })
      pendingRef.current = markdown

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(flush, AUTOSAVE_DELAY_MS)
    },
    [sheet, draftKey, flush],
  )

  return { sheet, loading, error, syncStatus, saveTitle, updateContent }
}
