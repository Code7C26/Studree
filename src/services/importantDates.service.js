/**
 * Fechas importantes del Inicio (parciales, finales, entregas): título + día.
 * Ver docs/features/home.md y docs/DB_SCHEMA.md (migración 0005).
 * Colección global del usuario (RLS filtra por dueño); no es parte del árbol del
 * explorador, por eso `notifies: false`.
 */

import { createCrudService } from './crudService.js'

const crud = createCrudService({ table: 'important_dates', orderBy: 'date', notifies: false })

export const importantDatesService = {
  ...crud,

  /**
   * @param {{title: string, date: string}} values - `date`: `YYYY-MM-DD`.
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').ImportantDate>>}
   */
  create({ title, date }) {
    return crud.create({ title: title.trim(), date })
  },

  /**
   * @param {string} id
   * @param {{title: string, date: string}} values
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').ImportantDate>>}
   */
  update(id, { title, date }) {
    return crud.update(id, { title: title.trim(), date })
  },
}
