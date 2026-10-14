/**
 * Links entre hojas (`[[Título]]`, ADR-015). Ver docs/features/subject-map.md.
 *
 * La tabla `sheet_links` es un ÍNDICE derivado del Markdown por la base
 * (trigger `refresh_sheet_links`, migración 0003): este service nunca inserta ni
 * borra filas de ahí. Conectar dos hojas es agregar `[[destino]]` al contenido
 * del origen; desconectarlas es quitarlo. Así el texto y el grafo no pueden
 * desincronizarse, y el export para IA lleva las relaciones adentro.
 */

import { getSupabase } from './supabase.client.js'
import { translateError } from './crudService.js'
import { sheetsService } from './sheets.service.js'
import { appendWikiLink, removeWikiLink } from '../lib/markdown/wikiLinks.js'

/**
 * Trae el contenido actual de una hoja, le aplica `transform` y lo guarda.
 * @param {string} sheetId
 * @param {(markdown: string) => string} transform
 * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Sheet>>}
 */
async function rewriteContent(sheetId, transform) {
  const { data: sheet, error } = await sheetsService.get(sheetId)
  if (error) return { data: null, error }
  if (!sheet) return { data: null, error: 'No se encontró la hoja.' }

  const next = transform(sheet.content_md ?? '')
  if (next === sheet.content_md) return { data: sheet, error: null }
  return sheetsService.saveContent(sheetId, next)
}

export const sheetLinksService = {
  /**
   * Links que SALEN de esas hojas (para dibujar las aristas del canvas de una materia).
   * @param {string[]} sheetIds
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').SheetLink[]>>}
   */
  async listForSheets(sheetIds) {
    if (sheetIds.length === 0) return { data: [], error: null }
    try {
      const { data, error } = await getSupabase()
        .from('sheet_links')
        .select('id, source_id, target_id')
        .in('source_id', sheetIds)
      if (error) return { data: [], error: translateError(error, 'No se pudieron cargar los enlaces.') }
      return { data, error: null }
    } catch (error) {
      return { data: [], error: translateError(error, 'No se pudieron cargar los enlaces.') }
    }
  },

  /**
   * Links salientes y entrantes (backlinks) de una hoja, con el título de la
   * otra punta (panel "Enlaces" del editor).
   * @param {string} sheetId
   * @returns {Promise<import('../types/models.js').ServiceResult<{outgoing: Array<{id: string, title: string}>, incoming: Array<{id: string, title: string}>}>>}
   */
  async listForSheet(sheetId) {
    try {
      const supabase = getSupabase()
      const [outgoing, incoming] = await Promise.all([
        supabase.from('sheet_links').select('target:sheets!sheet_links_target_id_fkey(id, title)').eq('source_id', sheetId),
        supabase.from('sheet_links').select('source:sheets!sheet_links_source_id_fkey(id, title)').eq('target_id', sheetId),
      ])
      const error = outgoing.error ?? incoming.error
      if (error) return { data: null, error: translateError(error, 'No se pudieron cargar los enlaces.') }

      const byTitle = (a, b) => a.title.localeCompare(b.title)
      return {
        data: {
          outgoing: outgoing.data.map((row) => row.target).filter(Boolean).sort(byTitle),
          incoming: incoming.data.map((row) => row.source).filter(Boolean).sort(byTitle),
        },
        error: null,
      }
    } catch (error) {
      return { data: null, error: translateError(error, 'No se pudieron cargar los enlaces.') }
    }
  },

  /**
   * Conecta dos hojas: agrega `[[target.title]]` al final del origen.
   * @param {{id: string}} source
   * @param {{title: string}} target
   */
  connect(source, target) {
    return rewriteContent(source.id, (markdown) => appendWikiLink(markdown, target.title))
  },

  /**
   * Desconecta dos hojas: quita `[[target.title]]` del origen (queda texto plano).
   * @param {{id: string}} source
   * @param {{title: string}} target
   */
  disconnect(source, target) {
    return rewriteContent(source.id, (markdown) => removeWikiLink(markdown, target.title))
  },
}
