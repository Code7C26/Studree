/**
 * Autosave de UNA hoja de la carpeta (ADR-017). Ver docs/features/sheet-editor.md.
 *
 * Envoltorio React de `lib/editor/sheetSaver.js`, donde viven todas las reglas
 * (borrador local, hojas nuevas, cola de guardados, cancelar antes de borrar)
 * con el service y la cache inyectados, probadas sin navegador. Acá solo se
 * crea el saver una vez, se exponen su estado y se lo vacía al desmontar o al
 * cerrar la pestaña.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { sheetsService } from '../services/sheets.service.js'
import { cacheKey, clearCache, readCache, writeCache } from '../services/cache.service.js'
import { createSheetSaver } from '../lib/editor/sheetSaver.js'

/** La cache de la app con la forma que espera el saver. */
const appCache = { key: cacheKey, read: readCache, write: writeCache, clear: clearCache }

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
 *   ensureCreated: () => Promise<string|null>,
 * }}
 */
export function useSheetAutosave({ sheet, onCreated }) {
  const [syncStatus, setSyncStatus] = useState('idle')
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)
  const onCreatedRef = useRef(onCreated)
  onCreatedRef.current = onCreated

  // Un saver por hoja montada, creado una sola vez (la `key` de la hoja es estable).
  // `start()` corre en el render y NO guarda nada (StrictMode renderiza dos
  // veces con refs nuevos): lo pendiente lo manda el efecto de abajo.
  const saverRef = useRef(null)
  const initialRef = useRef(null)
  if (saverRef.current === null) {
    saverRef.current = createSheetSaver({
      sheet,
      service: sheetsService,
      cache: appCache,
      onCreated: (localId, created) => onCreatedRef.current?.(localId, created),
      onStatus: (status, message) => {
        if (!mountedRef.current) return
        setSyncStatus(status)
        setError(message)
      },
    })
    initialRef.current = saverRef.current.start()
  }

  const updateContent = useCallback((markdown) => saverRef.current.update(markdown), [])
  const cancel = useCallback(() => saverRef.current.cancel(), [])
  const ensureCreated = useCallback(() => saverRef.current.ensureCreated(), [])

  // Al montar: mandar lo que `start()` dejó pendiente (plantilla nueva, borrador
  // a reenviar). Desmontar o cerrar la pestaña: mandar lo pendiente sin esperar
  // el debounce. Un remontaje con otro saver de la misma hoja local no crea dos
  // filas: el saver comparte un registro de creates por id local.
  useEffect(() => {
    mountedRef.current = true
    const saver = saverRef.current
    saver.flush()
    const onPageHide = () => {
      saver.flush()
    }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      mountedRef.current = false
      window.removeEventListener('pagehide', onPageHide)
      saver.flush()
    }
  }, [])

  return { initialContent: initialRef.current, syncStatus, error, updateContent, cancel, ensureCreated }
}
