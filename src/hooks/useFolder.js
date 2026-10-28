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
import { trashService } from '../services/trash.service.js'
import { cacheKey, clearCache, readCache } from '../services/cache.service.js'
import { onDataChanged } from '../services/dataEvents.js'
import { generateId } from '../lib/id.js'
import {
  LOCAL_SHEET_PREFIX,
  isLocalSheet,
  nextFolderSheets,
  orderFolderSheets,
  restoreLocalSheets,
} from '../lib/editor/folderSheets.js'
import { t } from '../lib/i18n/index.js'

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
 *   addLocalSheet: (content?: string) => string,
 *   replaceLocalSheet: (localId: string, created: import('../types/models.js').Sheet) => void,
 *   deleteSheet: (key: string) => Promise<{error: string|null, sheetId: string|null}>,
 *   restoreSheet: (id: string) => Promise<string|null>,
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
  /** Hojas actuales, para acciones que no pueden usar un objeto viejo (borrar). */
  const sheetsRef = useRef(sheets)
  sheetsRef.current = sheets
  /** Id de la última carga: una respuesta vieja (otra materia, carga lenta) se descarta. */
  const requestRef = useRef(0)

  /** @param {{silent?: boolean}} [options] */
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!subjectId) return
      const request = (requestRef.current += 1)
      if (!silent) setLoading(true)

      const [{ data: subjectRow, error: getError }, { data: rows, error: listError }] = await Promise.all([
        subjectsService.get(subjectId),
        sheetsService.list(subjectId, undefined, { columns: FOLDER_SHEET_COLUMNS }),
      ])
      if (request !== requestRef.current) return

      setSubject(subjectRow)
      setSubjectError(subjectRow ? null : (getError ?? t('importExport.export.subjectNotFound')))
      setError(listError)
      // Si la lista falló NO se usan sus filas (son la cache vieja): ver nextFolderSheets.
      setSheets((current) => nextFolderSheets(current, rows, listError, liveRef.current))
      setLoading(false)
    },
    [subjectId],
  )

  useEffect(() => {
    liveRef.current = new Map()
    // Hojas nuevas escritas sin conexión que no llegaron a crearse (sheetSaver):
    // vuelven como hojas locales y se crean apenas se edite de nuevo.
    setSheets(orderFolderSheets(restoreLocalSheets(readCache(cacheKey('sheet-local', subjectId), {}), subjectId)))
    load()
    return () => {
      requestRef.current += 1
    }
  }, [load, subjectId])

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

  /**
   * ＋ Nueva hoja: solo en pantalla hasta que tenga contenido. Con `content`
   * (plantilla) se guarda de entrada. Devuelve su id local.
   * @param {string} [content]
   */
  const addLocalSheet = useCallback(
    (content = '') => {
      const id = `${LOCAL_SHEET_PREFIX}${generateId()}`
      const now = new Date().toISOString()
      setSheets((current) => [
        ...current,
        { id, key: id, subject_id: subjectId, content_md: content, created_at: now, updated_at: null, createNow: Boolean(content.trim()) },
      ])
      return id
    },
    [subjectId],
  )

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

  /**
   * Manda una hoja a la papelera, por `key` y con el estado ACTUAL: una hoja
   * nueva puede haberse creado en Supabase mientras se confirmaba (su id
   * cambió). Una hoja local (nunca guardada) se descarta sin más.
   * @returns {Promise<{error: string|null, sheetId: string|null}>} `sheetId`
   *   de la hoja real mandada a la papelera (para "Deshacer").
   */
  const deleteSheet = useCallback(
    async (key) => {
      const sheet = sheetsRef.current.find((candidate) => candidate.key === key)
      if (!sheet) return { error: null, sheetId: null }
      const local = isLocalSheet(sheet)
      if (!local) {
        const { error: trashError } = await trashService.trash('sheets', sheet.id)
        if (trashError) {
          setError(trashError)
          return { error: trashError, sheetId: null }
        }
        clearCache(cacheKey('sheet', sheet.id))
      }
      liveRef.current.delete(sheet.id)
      setSheets((current) => current.filter((candidate) => candidate.id !== sheet.id))
      setError(null)
      return { error: null, sheetId: local ? null : sheet.id }
    },
    [],
  )

  /** "Deshacer": la hoja vuelve de la papelera y se recarga la carpeta. */
  const restoreSheet = useCallback(
    async (id) => {
      const { error: restoreError } = await trashService.restore('sheets', id)
      if (restoreError) {
        setError(restoreError)
        return restoreError
      }
      await load({ silent: true })
      return null
    },
    [load],
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
    restoreSheet,
    updateLiveContent,
  }
}
