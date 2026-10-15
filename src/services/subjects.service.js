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

const crud = createCrudService({ table: 'subjects', parentColumn: 'career_id', softDelete: true })

/**
 * Solo manda las columnas de posición si hay valor: así crear sin posición
 * sigue funcionando aunque todavía no se haya aplicado la migración 0002.
 * @param {number|null} x
 * @param {number|null} y
 */
export function positionFields(x, y) {
  return x == null || y == null ? {} : { pos_x: x, pos_y: y }
}

export const subjectsService = {
  ...crud,

  /**
   * Crea una materia dentro de una carrera.
   * `pos_x`/`pos_y` son opcionales: si el canvas está en modo manual, la
   * materia nace donde el usuario la pidió; si no, la posiciona dagre (ADR-012).
   * @param {{career_id: string, name: string, color?: string, status?: import('../types/models.js').SubjectStatus, position?: number, pos_x?: number|null, pos_y?: number|null}} values
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Subject>>}
   */
  create({ career_id, name, color, status = SUBJECT_STATUS.pendiente, position = 0, pos_x = null, pos_y = null }) {
    return crud.create(
      { career_id, name: name.trim(), color: color ?? DEFAULT_COLOR, status, position, ...positionFields(pos_x, pos_y) },
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
