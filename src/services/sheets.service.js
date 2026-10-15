/**
 * Hojas de una materia: el contenido real de los apuntes.
 * Ver docs/features/folder.md y docs/features/sheet-editor.md.
 *
 * Desde la migración 0004 (ADR-017) las hojas NO tienen título: se identifican
 * por su fecha de creación y se muestran en orden cronológico en la carpeta.
 * Los temas son los headings `#` del contenido.
 *
 * `content_md` guarda MARKDOWN, que es la fuente de verdad del contenido
 * (ADR-011). Nunca guardar HTML acá.
 */

import { createCrudService, translateError } from './crudService.js'
import { getSupabase } from './supabase.client.js'

const crud = createCrudService({ table: 'sheets', parentColumn: 'subject_id', orderBy: 'created_at', softDelete: true })

/** Columnas que necesita la carpeta (sin `title` ni `position`, que ya no se usan). */
export const FOLDER_SHEET_COLUMNS = 'id, subject_id, content_md, created_at, updated_at'

/** Máximo de resultados de la búsqueda por contenido. */
const SEARCH_LIMIT = 20

/**
 * Neutraliza los comodines de `ilike` para que el texto se busque literal.
 * PostgREST no respeta el escape con barra (`\%`), así que `%` y `\` se cambian
 * por `_` (un carácter cualquiera): nunca se pierde un resultado, y los falsos
 * positivos los descarta el cliente, que solo muestra hojas donde
 * `buildContentSnippet` encuentra el texto exacto.
 */
function escapeLike(text) {
  return text.replace(/[\\%]/g, '_')
}

export const sheetsService = {
  ...crud,

  /**
   * Crea una hoja en una materia. La crea la carpeta recién cuando la hoja
   * nueva tiene contenido (una hoja vacía nunca se guarda), salvo plantillas,
   * adjuntos e importación.
   * @param {{subject_id: string, content_md?: string, created_at?: string}} values
   *   `created_at`: solo al importar, para conservar la fecha original.
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Sheet>>}
   */
  create({ subject_id, content_md = '', created_at }) {
    return crud.create({ subject_id, content_md, position: 0, ...(created_at ? { created_at } : {}) }, subject_id)
  },

  /**
   * Guarda el contenido Markdown de una hoja (autosave del editor).
   *
   * No pasa por el `update` genérico a propósito: el editor guarda cada pocos
   * segundos y no queremos reescribir la lista entera de hojas en cache en cada
   * pulsación ni avisar "cambió la estructura". El borrador local lo maneja
   * `useSheetAutosave`.
   *
   * Devuelve la fila guardada: el autosave necesita su `updated_at` para saber
   * si un borrador local sigue siendo válido.
   *
   * @param {string} id
   * @param {string} contentMd
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Sheet>>}
   */
  async saveContent(id, contentMd) {
    try {
      const { data, error } = await getSupabase()
        .from('sheets')
        .update({ content_md: contentMd })
        .eq('id', id)
        .select()
        .single()

      if (error) return { data: null, error: translateError(error, 'No se pudo guardar la hoja.') }
      return { data, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, 'No se pudo guardar la hoja.') }
    }
  },

  /**
   * Busca hojas cuyo CONTENIDO contenga el texto (sin distinguir mayúsculas).
   * Corre en el servidor: el explorador no baja el contenido de las hojas.
   *
   * @param {string} query
   * @returns {Promise<import('../types/models.js').ServiceResult<Array<{id: string, subject_id: string, content_md: string, created_at: string}>>>}
   */
  async searchContent(query) {
    const text = query.trim()
    if (!text) return { data: [], error: null }

    try {
      const { data, error } = await getSupabase()
        .from('sheets')
        .select('id, subject_id, content_md, created_at')
        .ilike('content_md', `%${escapeLike(text)}%`)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(SEARCH_LIMIT)

      if (error) return { data: [], error: translateError(error, 'No se pudo buscar.') }
      return { data, error: null }
    } catch (error) {
      return { data: [], error: translateError(error, 'No se pudo buscar.') }
    }
  },
}
