/**
 * Enlaces de UNA hoja para el panel "Enlaces" del editor (ADR-015):
 * - `outgoing`: hojas a las que esta enlaza con `[[Título]]`;
 * - `incoming`: hojas que enlazan a esta (backlinks);
 * - `unresolved`: `[[Títulos]]` escritos que todavía no son ninguna hoja.
 * Ver docs/features/sheet-editor.md.
 *
 * Los links los deriva la base al guardar (trigger de la migración 0003, en la
 * misma transacción), así que se releen cada vez que el autosave termina bien.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { sheetLinksService } from '../services/sheetLinks.service.js'
import { sheetsService } from '../services/sheets.service.js'
import { extractWikiLinks, includesTitle } from '../lib/markdown/wikiLinks.js'

/**
 * @param {{id: string, subject_id: string}|null} sheet
 * @param {string} markdown - Contenido ACTUAL del editor (para los no resueltos).
 * @param {'idle'|'saving'|'saved'|'error'} syncStatus
 * @returns {{
 *   outgoing: Array<{id: string, title: string}>,
 *   incoming: Array<{id: string, title: string}>,
 *   unresolved: string[],
 *   reload: () => Promise<void>,
 *   createSheet: (title: string) => Promise<{data: import('../types/models.js').Sheet|null, error: string|null}>,
 * }}
 */
export function useSheetLinks(sheet, markdown, syncStatus) {
  const sheetId = sheet?.id
  const subjectId = sheet?.subject_id
  const [outgoing, setOutgoing] = useState([])
  const [incoming, setIncoming] = useState([])

  const reload = useCallback(async () => {
    if (!sheetId) return
    const { data } = await sheetLinksService.listForSheet(sheetId)
    if (data) {
      setOutgoing(data.outgoing)
      setIncoming(data.incoming)
    }
  }, [sheetId])

  useEffect(() => {
    setOutgoing([])
    setIncoming([])
    reload()
  }, [reload])

  useEffect(() => {
    if (syncStatus === 'saved') reload()
  }, [syncStatus, reload])

  // Lo que se escribió pero no es (todavía) ninguna hoja. Se excluye el propio
  // título: una hoja que se nombra a sí misma no es un link pendiente.
  const ownTitle = sheet?.title ?? ''
  const unresolved = useMemo(() => {
    const known = [ownTitle, ...outgoing.map((target) => target.title)]
    return extractWikiLinks(markdown).filter((title) => !includesTitle(known, title))
  }, [markdown, outgoing, ownTitle])

  /**
   * Crea en la misma materia la hoja de un `[[Título]]` no resuelto. La base
   * resuelve sola el link pendiente al aparecer ese título (trigger de la 0003).
   */
  const createSheet = useCallback(
    async (title) => {
      const result = await sheetsService.create({ subject_id: subjectId, title })
      if (!result.error) await reload()
      return result
    },
    [subjectId, reload],
  )

  return { outgoing, incoming, unresolved, reload, createSheet }
}
