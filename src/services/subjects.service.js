/**
 * Materias de una carrera. Ver docs/features/career-map.md.
 *
 * OJO: este service reemplaza por completo al del modelo viejo (Folder→Subject
 * en localStorage). El estado `bloqueada` NO se guarda acá: es derivado, se
 * calcula en `src/lib/graph/subjectStatus.js`.
 */

import { createCrudService, translateError } from './crudService.js'
import { getSupabase } from './supabase.client.js'
import { cacheKey, readCache, writeCache } from './cache.service.js'
import { notifyDataChanged } from './dataEvents.js'
import { SUBJECT_STATUS, SUBJECT_STATUS_VALUES } from '../constants/subjectStatus.js'
import { pickSubjectColor, withCareerColor } from '../lib/graph/careerColor.js'
import { t } from '../lib/i18n/index.js'

const crud = createCrudService({ table: 'subjects', parentColumn: 'career_id', softDelete: true })

/**
 * Color actual de una carrera: primero la cache de carreras, si no la base.
 * @param {string} careerId
 * @returns {Promise<string|null>}
 */
async function careerColorOf(careerId) {
  const cached = readCache(cacheKey('careers'), []).find((career) => career.id === careerId)
  if (cached?.color) return cached.color
  try {
    const { data } = await getSupabase().from('careers').select('color').eq('id', careerId).maybeSingle()
    return data?.color ?? null
  } catch {
    return null
  }
}

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
   * Sin `color`, toma el de su carrera.
   * @param {{career_id: string, name: string, color?: string, status?: import('../types/models.js').SubjectStatus, position?: number, pos_x?: number|null, pos_y?: number|null}} values
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Subject>>}
   */
  async create({ career_id, name, color, status = SUBJECT_STATUS.pendiente, position = 0, pos_x = null, pos_y = null }) {
    const finalColor = pickSubjectColor(color, color ? null : await careerColorOf(career_id))
    return crud.create(
      { career_id, name: name.trim(), color: finalColor, status, position, ...positionFields(pos_x, pos_y) },
      career_id,
    )
  },

  /**
   * Pone el color de la carrera en todas sus materias, también las de la papelera (así vuelven
   * con el color actual al restaurarlas).
   * @param {string} careerId
   * @param {string} color
   * @returns {Promise<import('../types/models.js').ServiceResult<boolean>>}
   */
  async setCareerColor(careerId, color) {
    try {
      const { error } = await getSupabase().from('subjects').update({ color }).eq('career_id', careerId)
      if (error) return { data: null, error: translateError(error, t('errors.crud.save')) }
      for (const key of [cacheKey('subjects', careerId), cacheKey('subjects')]) {
        writeCache(key, withCareerColor(readCache(key, []), careerId, color))
      }
      notifyDataChanged()
      return { data: true, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, t('errors.crud.save')) }
    }
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
        error: t('careerMap.errors.invalidStatus', { status, valid: SUBJECT_STATUS_VALUES.join(', ') }),
      })
    }
    return crud.update(id, { status }, careerId)
  },
}
