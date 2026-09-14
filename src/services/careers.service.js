/**
 * Carreras (raíz de la jerarquía). Ver docs/DB_SCHEMA.md y docs/API_DOCS.md.
 * Es una colección global del usuario: no tiene padre, RLS ya la filtra por dueño.
 */

import { createCrudService } from './crudService.js'
import { DEFAULT_COLOR } from '../constants/palette.js'

const crud = createCrudService({ table: 'careers', orderBy: 'created_at' })

export const careersService = {
  ...crud,

  /**
   * Crea una carrera.
   * @param {{name: string, color?: string}} values
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Career>>}
   */
  create({ name, color }) {
    return crud.create({ name: name.trim(), color: color ?? DEFAULT_COLOR })
  },
}
