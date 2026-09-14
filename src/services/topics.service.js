/**
 * Temas de una unidad (segundo nivel del canvas; el canvas corta acá).
 * Ver docs/features/subject-map.md.
 */

import { createCrudService } from './crudService.js'

const crud = createCrudService({ table: 'topics', parentColumn: 'unit_id' })

export const topicsService = {
  ...crud,

  /**
   * Crea un tema dentro de una unidad.
   * @param {{unit_id: string, name: string, position?: number}} values
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Topic>>}
   */
  create({ unit_id, name, position = 0 }) {
    return crud.create({ unit_id, name: name.trim(), position }, unit_id)
  },
}
