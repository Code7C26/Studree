/**
 * Hojas de un tema: el contenido real de los apuntes.
 * Ver docs/features/sheet-editor.md.
 *
 * `content_md` guarda MARKDOWN, que es la fuente de verdad del contenido
 * (ADR-011). Nunca guardar HTML acá.
 */

import { createCrudService } from './crudService.js'
import { getSupabase } from './supabase.client.js'
import { translateError } from './crudService.js'

const crud = createCrudService({ table: 'sheets', parentColumn: 'topic_id' })

export const sheetsService = {
  ...crud,

  /**
   * Crea una hoja vacía dentro de un tema.
   * @param {{topic_id: string, title: string, content_md?: string, position?: number}} values
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Sheet>>}
   */
  create({ topic_id, title, content_md = '', position = 0 }) {
    return crud.create({ topic_id, title: title.trim(), content_md, position }, topic_id)
  },

  /**
   * Guarda el contenido Markdown de una hoja (autosave del editor).
   *
   * No pasa por el `update` genérico a propósito: el editor guarda cada pocos
   * segundos y no queremos reescribir la lista entera de hojas en cache en cada
   * pulsación. El borrador local lo maneja `useSheet`.
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
   * Cuenta las hojas por tema, para el badge del canvas de materia — SIN traer
   * `content_md` (puede ser pesado) ni las filas completas (docs/features/subject-map.md
   * pide un `count` agregado, no arrastrar todas las hojas de la materia).
   * @param {string[]} topicIds
   * @returns {Promise<import('../types/models.js').ServiceResult<Map<string, number>>>}
   */
  async countByTopics(topicIds) {
    if (topicIds.length === 0) return { data: new Map(), error: null }

    try {
      const { data, error } = await getSupabase().from('sheets').select('id, topic_id').in('topic_id', topicIds)

      if (error) return { data: new Map(), error: translateError(error, 'No se pudieron contar las hojas.') }

      const counts = new Map()
      for (const row of data) counts.set(row.topic_id, (counts.get(row.topic_id) ?? 0) + 1)
      return { data: counts, error: null }
    } catch (error) {
      return { data: new Map(), error: translateError(error, 'No se pudieron contar las hojas.') }
    }
  },
}
