/**
 * Hojas de una materia: el contenido real de los apuntes.
 * Ver docs/features/sheet-editor.md y docs/features/subject-map.md.
 *
 * Desde la migración 0003 (ADR-014) la hoja cuelga directo de la materia
 * (`subject_id`); `topic_id` es un campo legado que ya no se usa.
 *
 * `content_md` guarda MARKDOWN, que es la fuente de verdad del contenido
 * (ADR-011). Nunca guardar HTML acá. Los `[[links]]` del contenido los indexa
 * la base sola en `sheet_links` (trigger, ADR-015).
 */

import { createCrudService, translateError } from './crudService.js'
import { getSupabase } from './supabase.client.js'
import { positionFields } from './subjects.service.js'

const crud = createCrudService({ table: 'sheets', parentColumn: 'subject_id' })

/**
 * Columnas de una hoja SIN el contenido: para listas, explorador y canvas, que
 * no necesitan `content_md` (puede ser pesado).
 */
export const SHEET_SUMMARY_COLUMNS = 'id, subject_id, title, position, pos_x, pos_y, created_at, updated_at'

/** Máximo de resultados de la búsqueda por contenido. */
const SEARCH_LIMIT = 20

const DUPLICATE_TITLE_ERROR = 'Ya existe una hoja con ese título en esta materia.'

/** Los títulos son únicos por materia (índice único en la 0003): mensaje claro para ese caso. */
function withDuplicateMessage(result) {
  if (result.error && /ya existe un registro igual/i.test(result.error)) {
    return { ...result, error: DUPLICATE_TITLE_ERROR }
  }
  return result
}

/** Escapa los comodines de `ilike` (`%`, `_`) y la barra invertida. */
function escapeLike(text) {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`)
}

export const sheetsService = {
  ...crud,

  /**
   * Crea una hoja dentro de una materia.
   * `pos_x`/`pos_y` son opcionales: si el canvas está en modo manual, la hoja
   * nace donde el usuario la pidió; si no, la posiciona el auto-layout (ADR-012).
   * @param {{subject_id: string, title: string, content_md?: string, position?: number, pos_x?: number|null, pos_y?: number|null}} values
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Sheet>>}
   */
  async create({ subject_id, title, content_md = '', position = 0, pos_x = null, pos_y = null }) {
    return withDuplicateMessage(
      await crud.create(
        { subject_id, title: title.trim(), content_md, position, ...positionFields(pos_x, pos_y) },
        subject_id,
      ),
    )
  },

  /**
   * Actualiza una hoja (ej. renombrar). Si cambia el título, la base reescribe
   * sola los `[[título viejo]]` de las hojas que la enlazaban (trigger de la 0003).
   * @param {string} id
   * @param {Object} values
   * @param {string} [subjectId]
   * @param {{silent?: boolean}} [options]
   */
  async update(id, values, subjectId, options) {
    return withDuplicateMessage(await crud.update(id, values, subjectId, options))
  },

  /**
   * Guarda el contenido Markdown de una hoja (autosave del editor).
   *
   * No pasa por el `update` genérico a propósito: el editor guarda cada pocos
   * segundos y no queremos reescribir la lista entera de hojas en cache en cada
   * pulsación. El borrador local lo maneja `useSheet`.
   *
   * Devuelve la fila guardada: `useSheet` necesita su `updated_at` para saber
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
   * Corre en el servidor: antes el explorador bajaba el `content_md` de todas
   * las hojas solo para poder buscar en el cliente.
   *
   * @param {string} query
   * @returns {Promise<import('../types/models.js').ServiceResult<Array<{id: string, title: string, subject_id: string, content_md: string}>>>}
   */
  async searchContent(query) {
    const text = query.trim()
    if (!text) return { data: [], error: null }

    try {
      const { data, error } = await getSupabase()
        .from('sheets')
        .select('id, title, subject_id, content_md')
        .ilike('content_md', `%${escapeLike(text)}%`)
        .order('updated_at', { ascending: false })
        .limit(SEARCH_LIMIT)

      if (error) return { data: [], error: translateError(error, 'No se pudo buscar.') }
      return { data, error: null }
    } catch (error) {
      return { data: [], error: translateError(error, 'No se pudo buscar.') }
    }
  },
}
