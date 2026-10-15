/**
 * Tareas pendientes del Inicio: texto + fecha límite opcional; `done_at` NULL =
 * pendiente. Ver docs/features/home.md y docs/DB_SCHEMA.md (migración 0005).
 */

import { createCrudService } from './crudService.js'

const crud = createCrudService({ table: 'tasks', orderBy: 'created_at', notifies: false })

export const tasksService = {
  ...crud,

  /**
   * @param {{text: string, due_date?: string|null}} values
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Task>>}
   */
  create({ text, due_date = null }) {
    return crud.create({ text: text.trim(), due_date: due_date || null })
  },

  /**
   * @param {string} id
   * @param {string} text
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Task>>}
   */
  rename(id, text) {
    return crud.update(id, { text: text.trim() })
  },

  /**
   * Tildar / destildar. Se guarda el momento (no un boolean) para ordenar
   * "Hechas" por la más reciente.
   * @param {string} id
   * @param {boolean} done
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Task>>}
   */
  setDone(id, done) {
    return crud.update(id, { done_at: done ? new Date().toISOString() : null })
  },
}
