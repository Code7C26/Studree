/**
 * Unidades de una materia (primer nivel del canvas de materia).
 * Ver docs/features/subject-map.md.
 */

import { createCrudService } from './crudService.js'
import { positionFields } from './subjects.service.js'

const crud = createCrudService({ table: 'units', parentColumn: 'subject_id' })

export const unitsService = {
  ...crud,

  /**
   * Crea una unidad dentro de una materia.
   * @param {{subject_id: string, name: string, position?: number, pos_x?: number|null, pos_y?: number|null}} values
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Unit>>}
   */
  create({ subject_id, name, position = 0, pos_x = null, pos_y = null }) {
    return crud.create({ subject_id, name: name.trim(), position, ...positionFields(pos_x, pos_y) }, subject_id)
  },
}
