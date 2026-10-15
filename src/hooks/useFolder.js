/**
 * Estado de la carpeta de una materia (ADR-017): la materia y TODAS sus hojas
 * con contenido, en orden cronológico, más las hojas locales nuevas que
 * todavía no se guardaron. Ver docs/features/folder.md.
 *
 * Cada hoja lleva `key`: un identificador estable para React. Una hoja local
 * que se guarda cambia de `id` (local → real) pero conserva su `key`, así su
 * editor NO se remonta mientras el usuario escribe.
 *
 * `liveContent` refleja lo que se está escribiendo (con debounce) para que el
 * índice de temas y el buscador estén al día sin esperar al servidor.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { subjectsService } from '../services/subjects.service.js'
import { sheetsService, FOLDER_SHEET_COLUMNS } from '../services/sheets.service.js'
import { cacheKey, clearCache } from '../services/cache.service.js'
import { onDataChanged } from '../services/dataEvents.js'
import { generateId } from '../lib/id.js'
import { LOCAL_SHEET_PREFIX, isLocalSheet, orderFolderSheets } from '../lib/editor/folderSheets.js'

const LIVE_CONTENT_DELAY_MS = 300

/**
 * @typedef {import('../types/models.js').Sheet & {key: string}} FolderSheet
 */

/**
 * @param {string} subjectId
 * @returns {{
 *   subject: import('../types/models.js').Subject|null,
 *   subjectError: string|null,
 *   sheets: FolderSheet[],
 *   loading: boolean,
 *   error: string|null,
 *   clearError: () => void,
 *   reload: () => Promise<void>,
 *   addLocalSheet: () => string,
 *   replaceLocalSheet: (localId: string, created: import('../types/models.js').Sheet) => void,
 *   deleteSheet: (sheet: FolderSheet) => Promise<string|null>,
 *   updateLiveContent: (id: string, markdown: string) => void,
 * }}
 */
export function useFolder(subjectId) {
  const [subject, setSubject] = useState(null)
  const [subjectError, setSubjectError] = useState(null)
  const [sheets, setSheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /** id → contenido que se está escribiendo (más nuevo que el del servidor). */
  const liveRef = useRef(new Map())
  const liveTimerRef = useRef(null)

  /** @param {{silent?: boolean}} [options] */
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!subjectId) return
      if (!silent) setLoading(true)

      const [{ data: subjectRow, error: getError }, { data: rows, error: listError }] = await Promise.all([
        subjectsService.get(subjectId),
        sheetsService.list(subjectId, undefined, { columns: FOLDER_SHEET_COLUMNS }),
      ])

      setSubject(subjectRow)
      setSubjectError(subjectRow ? null : (getError ?? 'No se encontró la materia.'))
      setError(listError)
      setSheets((current) => {
        const keyById = new Map(current.map((sheet) => [sheet.id, sheet.key]))
        const saved = (rows ?? []).map((row) => ({
          ...row,
          key: keyById.get(row.id) ?? row.id,
          content_md: liveRef.current.get(row.id) ?? row.content_md,
        }))
        // Las locales no vienen del servidor: se conservan (siguen al final).
        return orderFolderSheets([...saved, ...current.filter(isLocalSheet)])
      })
      setLoading(false)
    },
    [subjectId],
  )

  useEffect(() => {
    liveRef.current = new Map()
    setSheets([])
    load()
  }, [load])

  // Otra vista (explorador, otra pestaña de la app) creó / borró algo: recargar en silencio.
  useEffect(() => {
    let timer = null
    const unsubscribe = onDataChanged(() => {
      clearTimeout(timer)
      timer = setTimeout(() => load({ silent: true }), 300)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [load])

  useEffect(() => () => clearTimeout(liveTimerRef.current), [])

  /** ＋ Nueva hoja: solo en pantalla hasta que tenga contenido. Devuelve su id local. */
  const addLocalSheet = useCallback(() => {
    const id = `${LOCAL_SHEET_PREFIX}${generateId()}`
    const now = new Date().toISOString()
    setSheets((current) => [
      ...current,
      { id, key: id, subject_id: subjectId, content_md: '', created_at: now, updated_at: null },
    ])
    return id
  }, [subjectId])

  /** La hoja local ya existe en Supabase: toma el id real y conserva su `key`. */
  const replaceLocalSheet = useCallback((localId, created) => {
    const live = liveRef.current.get(localId)
    liveRef.current.delete(localId)
    if (live != null) liveRef.current.set(created.id, live)
    setSheets((current) =>
      current.map((sheet) =>
        sheet.id === localId ? { ...created, key: sheet.key, content_md: live ?? created.content_md } : sheet,
      ),
    )
  }, [])

  const deleteSheet = useCallback(
    async (sheet) => {
      if (!isLocalSheet(sheet)) {
        const { error: removeError } = await sheetsService.remove(sheet.id, subjectId)
        if (removeError) {
          setError(removeError)
          return removeError
        }
        clearCache(cacheKey('sheet', sheet.id))
      }
      liveRef.current.delete(sheet.id)
      setSheets((current) => current.filter((candidate) => candidate.id !== sheet.id))
      setError(null)
      return null
    },
    [subjectId],
  )

  /** Lo que se está escribiendo, para el índice y el buscador (con debounce). */
  const updateLiveContent = useCallback((id, markdown) => {
    liveRef.current.set(id, markdown)
    clearTimeout(liveTimerRef.current)
    liveTimerRef.current = setTimeout(() => {
      setSheets((current) =>
        current.map((sheet) => {
          const live = liveRef.current.get(sheet.id)
          return live != null && live !== sheet.content_md ? { ...sheet, content_md: live } : sheet
        }),
      )
    }, LIVE_CONTENT_DELAY_MS)
  }, [])

  const clearError = useCallback(() => setError(null), [])
  const reload = useCallback(() => load({ silent: true }), [load])

  return {
    subject,
    subjectError,
    sheets,
    loading,
    error,
    clearError,
    reload,
    addLocalSheet,
    replaceLocalSheet,
    deleteSheet,
    updateLiveContent,
  }
}
