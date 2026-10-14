/**
 * Estado y acciones del canvas de materia (ADR-014): la materia, sus HOJAS
 * (nodos) y los `[[links]]` entre ellas (aristas, ADR-015), más el layout
 * manual (ADR-012). Ver docs/features/subject-map.md.
 *
 * Las hojas se traen SIN `content_md` (el canvas no lo necesita). Conectar o
 * desconectar edita el Markdown del origen (sheetLinksService) y después se
 * releen los links que derivó la base.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { subjectsService } from '../services/subjects.service.js'
import { sheetsService, SHEET_SUMMARY_COLUMNS } from '../services/sheets.service.js'
import { sheetLinksService } from '../services/sheetLinks.service.js'
import { onDataChanged } from '../services/dataEvents.js'

/**
 * @typedef {Object} CreateSheetValues
 * @property {string} title
 * @property {{x: number, y: number}|null} [position] - null = la ubica el auto-layout.
 * @property {import('../types/models.js').Sheet|null} [linkFrom] - Si viene, la hoja
 *   nueva nace enlazada desde esa (el "+" del nodo, estilo n8n).
 */

/**
 * @param {string} subjectId
 * @returns {{
 *   subject: import('../types/models.js').Subject|null,
 *   subjectError: string|null,
 *   sheets: import('../types/models.js').Sheet[],
 *   links: import('../types/models.js').SheetLink[],
 *   loading: boolean,
 *   error: string|null,
 *   clearError: () => void,
 *   createSheet: (values: CreateSheetValues) => Promise<string|null>,
 *   deleteSheet: (id: string) => Promise<string|null>,
 *   connect: (sourceId: string, targetId: string) => Promise<string|null>,
 *   disconnect: (link: import('../types/models.js').SheetLink) => Promise<string|null>,
 *   moveNodes: (moves: Array<{id: string, x: number, y: number}>) => Promise<string|null>,
 *   resetLayout: () => Promise<string|null>,
 * }}
 */
export function useSubjectMap(subjectId) {
  const [subject, setSubject] = useState(null)
  const [subjectError, setSubjectError] = useState(null)
  const [sheets, setSheets] = useState([])
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const sheetsRef = useRef(sheets)
  sheetsRef.current = sheets

  /** @param {{silent?: boolean}} [options] - `silent`: recargar sin mostrar "Cargando…". */
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!subjectId) return
      if (!silent) setLoading(true)

      const [{ data: subjectRow, error: getError }, { data: sheetRows, error: sheetsError }] = await Promise.all([
        subjectsService.get(subjectId),
        sheetsService.list(subjectId, undefined, { columns: SHEET_SUMMARY_COLUMNS }),
      ])
      const { data: linkRows, error: linksError } = await sheetLinksService.listForSheets(
        (sheetRows ?? []).map((sheet) => sheet.id),
      )

      setSubject(subjectRow)
      setSubjectError(subjectRow ? null : (getError ?? 'No se encontró la materia.'))
      setSheets(sheetRows ?? [])
      setLinks(linkRows ?? [])
      setError(sheetsError ?? linksError)
      setLoading(false)
    },
    [subjectId],
  )

  useEffect(() => {
    load()
  }, [load])

  // Otra vista (explorador, editor) creó / renombró / borró algo: recargar en
  // silencio, para que el canvas abierto no muestre datos viejos.
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

  /** Relee solo los links (después de conectar / desconectar / crear enlazada). */
  const reloadLinks = useCallback(async () => {
    const { data, error: linksError } = await sheetLinksService.listForSheets(sheetsRef.current.map((sheet) => sheet.id))
    if (!linksError) setLinks(data)
    return linksError
  }, [])

  const fail = useCallback((message) => {
    setError(message)
    return message
  }, [])

  const createSheet = useCallback(
    async ({ title, position = null, linkFrom = null }) => {
      const { data, error: createError } = await sheetsService.create({
        subject_id: subjectId,
        title,
        position: sheetsRef.current.length,
        pos_x: position?.x ?? null,
        pos_y: position?.y ?? null,
      })
      if (createError) return fail(createError)
      setSheets((current) => [...current, data])

      if (linkFrom) {
        const { error: linkError } = await sheetLinksService.connect(linkFrom, data)
        if (linkError) return fail(linkError)
        await reloadLinks()
      }

      setError(null)
      return null
    },
    [subjectId, fail, reloadLinks],
  )

  const deleteSheet = useCallback(
    async (id) => {
      const { error: removeError } = await sheetsService.remove(id, subjectId)
      if (removeError) return fail(removeError)
      setSheets((current) => current.filter((sheet) => sheet.id !== id))
      // La base borra en cascada los links de esa hoja; se refleja acá también.
      setLinks((current) => current.filter((link) => link.source_id !== id && link.target_id !== id))
      setError(null)
      return null
    },
    [subjectId, fail],
  )

  const connect = useCallback(
    async (sourceId, targetId) => {
      const source = sheetsRef.current.find((sheet) => sheet.id === sourceId)
      const target = sheetsRef.current.find((sheet) => sheet.id === targetId)
      if (!source || !target || sourceId === targetId) return null

      // Optimista: la arista aparece ya; si falla, se relee lo real.
      const temporary = { id: `temp:${sourceId}:${targetId}`, source_id: sourceId, target_id: targetId }
      setLinks((current) =>
        current.some((link) => link.source_id === sourceId && link.target_id === targetId) ? current : [...current, temporary],
      )

      const { error: connectError } = await sheetLinksService.connect(source, target)
      await reloadLinks()
      if (connectError) return fail(connectError)
      setError(null)
      return null
    },
    [fail, reloadLinks],
  )

  const disconnect = useCallback(
    async (link) => {
      const target = sheetsRef.current.find((sheet) => sheet.id === link.target_id)
      if (!target) return null
      setLinks((current) => current.filter((candidate) => candidate.id !== link.id))

      const { error: disconnectError } = await sheetLinksService.disconnect({ id: link.source_id }, target)
      await reloadLinks()
      if (disconnectError) return fail(disconnectError)
      setError(null)
      return null
    },
    [fail, reloadLinks],
  )

  /**
   * Guarda posiciones manuales (ADR-012) en un solo request (ADR-016).
   * Optimista; si Supabase falla, se recarga lo que hay en la base.
   */
  const moveNodes = useCallback(
    async (moves) => {
      if (moves.length === 0) return null
      const byId = new Map(moves.map((move) => [move.id, move]))
      setSheets((current) =>
        current.map((sheet) =>
          byId.has(sheet.id) ? { ...sheet, pos_x: byId.get(sheet.id).x, pos_y: byId.get(sheet.id).y } : sheet,
        ),
      )

      const { error: saveError } = await sheetsService.savePositions(moves, subjectId)
      if (saveError) {
        await load({ silent: true })
        return fail(saveError)
      }
      return null
    },
    [subjectId, load, fail],
  )

  /** "Reordenar": borra las posiciones manuales y vuelve al auto-layout. */
  const resetLayout = useCallback(async () => {
    const { error: clearError } = await sheetsService.clearPositions([subjectId])
    if (clearError) return fail(clearError)
    setSheets((current) => current.map((sheet) => ({ ...sheet, pos_x: null, pos_y: null })))
    setError(null)
    return null
  }, [subjectId, fail])

  const clearError = useCallback(() => setError(null), [])

  return {
    subject,
    subjectError,
    sheets,
    links,
    loading,
    error,
    clearError,
    createSheet,
    deleteSheet,
    connect,
    disconnect,
    moveNodes,
    resetLayout,
  }
}
