/**
 * Carreras (raíz de la jerarquía). Ver docs/DB_SCHEMA.md y docs/API_DOCS.md.
 * Es una colección global del usuario: no tiene padre, RLS ya la filtra por dueño.
 */

import { createCrudService } from './crudService.js'
import { subjectsService } from './subjects.service.js'
import { DEFAULT_COLOR } from '../constants/palette.js'

const crud = createCrudService({ table: 'careers', orderBy: 'created_at', softDelete: true })

export const careersService = {
  ...crud,

  /**
   * Crea una carrera.
   * @param {{name: string, color?: string, uses_prerequisites?: boolean}} values
   *   `uses_prerequisites`: false para un curso / organizador sin correlativas (ADR-013).
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Career>>}
   */
  create({ name, color, uses_prerequisites = true }) {
    // `true` es el default de la columna: solo se manda si es `false`, así crear
    // una carrera común no depende de que ya esté aplicada la migración 0002.
    return crud.create({
      name: name.trim(),
      color: color ?? DEFAULT_COLOR,
      ...(uses_prerequisites ? {} : { uses_prerequisites: false }),
    })
  },

  /**
   * Actualiza una carrera. Si trae `color`, lo baja a todas sus materias: la carpeta, el margen
   * de las hojas y las pestañas usan el color de la materia (ADR-018).
   * @param {string} id
   * @param {{name?: string, color?: string, uses_prerequisites?: boolean}} values
   * @param {string} [parentId]
   * @param {{silent?: boolean}} [options]
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Career>>}
   */
  async update(id, values, parentId, options) {
    const result = await crud.update(id, values, parentId, options)
    if (result.error || !values.color) return result
    const synced = await subjectsService.setCareerColor(id, values.color)
    return synced.error ? { data: result.data, error: synced.error } : result
  },
}
