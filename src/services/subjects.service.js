/**
 * Materias de una carrera. Ver docs/features/career-map.md.
 *
 * OJO: este service reemplaza por completo al del modelo viejo (Folder→Subject
 * en localStorage). El estado `bloqueada` NO se guarda acá: es derivado, se
 * calcula en `src/lib/graph/subjectStatus.js`.
 */

import { createCrudService } from './crudService.js'
import { DEFAULT_COLOR } from '../constants/palette.js'
import { SUBJECT_STATUS, SUBJECT_STATUS_VALUES } from '../constants/subjectStatus.js'

const crud = createCrudService({ table: 'subjects', parentColumn: 'career_id' })

export const subjectsService = {
  ...crud,

  /**
   * Crea una materia dentro de una carrera.
   * @param {{career_id: string, name: string, color?: string, status?: import('../types/models.js').SubjectStatus, position?: number}} values
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Subject>>}
   */
  create({ career_id, name, color, status = SUBJECT_STATUS.pendiente, position = 0 }) {
    return crud.create(
      { career_id, name: name.trim(), color: color ?? DEFAULT_COLOR, status, position },
      career_id,
    )
  },

  /**
   * Cambia el estado declarado de una materia.
   * Se valida en el cliente para dar un error claro, pero la base tiene el mismo
   * CHECK: no se confía solo en esta validación (docs/03-security.md).
   * @param {string} id
   * @param {import('../types/models.js').SubjectStatus} status
   * @param {string} careerId
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Subject>>}
   */
  setStatus(id, status, careerId) {
    if (!SUBJECT_STATUS_VALUES.includes(status)) {
      return Promise.resolve({
        data: null,
        error: `Estado inválido: "${status}". Válidos: ${SUBJECT_STATUS_VALUES.join(', ')}.`,
      })
    }
    return crud.update(id, { status }, careerId)
  },
}
