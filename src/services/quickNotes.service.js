/**
 * Notas rápidas del Inicio (tarjetas de texto plano).
 * Ver docs/features/home.md y docs/DB_SCHEMA.md (migración 0005).
 */

import { createCrudService } from './crudService.js'

const crud = createCrudService({ table: 'quick_notes', orderBy: 'created_at', notifies: false })

export const quickNotesService = {
  ...crud,

  /**
   * @param {string} body
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').QuickNote>>}
   */
  create(body) {
    return crud.create({ body: body.trim() })
  },

  /**
   * @param {string} id
   * @param {string} body
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').QuickNote>>}
   */
  updateBody(id, body) {
    return crud.update(id, { body: body.trim() })
  },
}
