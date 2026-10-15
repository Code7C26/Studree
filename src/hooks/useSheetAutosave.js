/**
 * Autosave de UNA hoja de la carpeta (ADR-017). Ver docs/features/sheet-editor.md.
 *
 * Es la lógica de guardado de la Fase 0, ahora por hoja:
 * - Borrador local `{ content, baseUpdatedAt }` escrito en cada cambio; solo
 *   gana al abrir si el servidor no cambió desde entonces (`resolveDraft`).
 * - Debounce de 800 ms hacia Supabase; los guardados de una hoja van en fila
 *   (nunca dos a la vez, nunca uno viejo después de uno nuevo).
 * - Flush al desmontar y en `pagehide`, para no perder lo último.
 * - Hoja LOCAL (＋ Nueva hoja, id `local:…`): no existe en Supabase hasta que
 *   tiene contenido no vacío; el primer flush la CREA y avisa con `onCreated`.
 * - `cancel()` descarta lo pendiente (antes de borrar una hoja, para que el
 *   flush del desmontaje no la vuelva a crear o a guardar).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sheetsService } from '../services/sheets.service.js'
import { cacheKey, clearCache, readCache, writeCache } from '../services/cache.service.js'
import { isLocalSheet, resolveDraft } from '../lib/editor/folderSheets.js'

const AUTOSAVE_DELAY_MS = 800

/**
 * @param {Object} params
 * @param {import('../types/models.js').Sheet} params.sheet - Si es local, `id` empieza con `local:`.
 * @param {(localId: string, created: import('../types/models.js').Sheet) => void} params.onCreated
 * @returns {{
 *   initialContent: string,
 *   syncStatus: 'idle'|'saving'|'saved'|'error',
 *   error: string|null,
 *   updateContent: (markdown: string) => void,
 *   cancel: () => void,
 * }}
 */
export function useSheetAutosave({ sheet, onCreated }) {
  const [syncStatus, setSyncStatus] = useState('idle')
  const [error, setError] = useState(null)

  /** Id real en Supabase (null mientras la hoja sea local). */
  const idRef = useRef(isLocalSheet(sheet) ? null : sheet.id)
  const localIdRef = useRef(isLocalSheet(sheet) ? sheet.id : null)
  const baseRef = useRef(sheet.updated_at ?? null)
  const pendingRef = useRef(null)
  const timerRef = useRef(null)
  /** Cola de guardados: cada flush espera al anterior. */
  const queueRef = useRef(Promise.resolve())
  const mountedRef = useRef(true)
  const onCreatedRef = useRef(onCreated)
  onCreatedRef.current = onCreated

  // Contenido inicial: se decide UNA vez, al montar (el editor solo lo lee al montar).
  const initial = useMemo(
    () => {
      if (isLocalSheet(sheet)) return { content: sheet.content_md ?? '', resend: false, clearDraft: false }
      return resolveDraft(readCache(cacheKey('sheet', sheet.id), null), sheet)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const draftKey = () => (idRef.current ? cacheKey('sheet', idRef.current) : null)

  const runFlush = useCallback(async () => {
    const markdown = pendingRef.current
    if (markdown == null) return
    pendingRef.current = null

    // Hoja local: se crea recién con contenido. Vacía → no se guarda nada.
    if (!idRef.current) {
      if (!markdown.trim()) return
      if (mountedRef.current) setSyncStatus('saving')
      const { data, error: createError } = await sheetsService.create({
        subject_id: sheet.subject_id,
        content_md: markdown,
      })
      if (createError) {
        pendingRef.current = pendingRef.current ?? markdown // se reintenta en el próximo cambio
        if (mountedRef.current) {
          setSyncStatus('error')
          setError(createError)
        }
        return
      }
      idRef.current = data.id
      baseRef.current = data.updated_at
      onCreatedRef.current?.(localIdRef.current, data)
      if (mountedRef.current) {
        setSyncStatus('saved')
        setError(null)
      }
      return
    }

    if (mountedRef.current) setSyncStatus('saving')
    const { data, error: saveError } = await sheetsService.saveContent(idRef.current, markdown)
    if (saveError) {
      // Lo pendiente sigue en el borrador local: se reintenta en el próximo cambio o al reabrir.
      if (mountedRef.current) {
        setSyncStatus('error')
        setError(saveError)
      }
      return
    }

    baseRef.current = data.updated_at
    const key = draftKey()
    const draft = readCache(key, null)
    if (draft?.content === markdown) clearCache(key)
    else if (draft) writeCache(key, { ...draft, baseUpdatedAt: data.updated_at })

    if (mountedRef.current) {
      setSyncStatus('saved')
      setError(null)
    }
    // sheet.subject_id no cambia durante la vida de la hoja.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Manda YA lo pendiente (en fila detrás de cualquier guardado en curso). */
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    queueRef.current = queueRef.current.then(runFlush)
    return queueRef.current
  }, [runFlush])

  const updateContent = useCallback(
    (markdown) => {
      const key = draftKey()
      if (key) writeCache(key, { content: markdown, baseUpdatedAt: baseRef.current })
      pendingRef.current = markdown
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(flush, AUTOSAVE_DELAY_MS)
    },
    [flush],
  )

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    pendingRef.current = null
    const key = draftKey()
    if (key) clearCache(key)
  }, [])

  // Al montar: aplicar la decisión sobre el borrador local.
  useEffect(() => {
    if (initial.clearDraft) clearCache(cacheKey('sheet', sheet.id))
    if (initial.resend) {
      pendingRef.current = initial.content
      flush()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Desmontar o cerrar la pestaña: mandar lo pendiente sin esperar el debounce.
  useEffect(() => {
    mountedRef.current = true
    const onPageHide = () => {
      flush()
    }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      mountedRef.current = false
      window.removeEventListener('pagehide', onPageHide)
      flush()
    }
  }, [flush])

  return { initialContent: initial.content, syncStatus, error, updateContent, cancel }
}
