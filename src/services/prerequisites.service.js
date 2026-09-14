/**
 * Correlativas entre materias. Ver docs/features/career-map.md.
 *
 * Es el único service con lógica de validación propia: ANTES de insertar
 * comprueba que la correlativa nueva no cierre un ciclo (ADR-009). Si lo
 * cerrara, rechaza sin escribir y devuelve el ciclo concreto en el mensaje,
 * porque un "operación inválida" a secas no le sirve a nadie.
 */

import { createCrudService, translateError } from './crudService.js'
import { getSupabase } from './supabase.client.js'
import { cacheKey, readCache, writeCache } from './cache.service.js'
import { wouldCreateCycle, formatCycle } from '../lib/graph/validateDag.js'
import { PREREQUISITE_KIND_VALUES } from '../constants/prerequisiteKinds.js'
import { generateId } from '../lib/id.js'

const crud = createCrudService({ table: 'prerequisites', orderBy: 'id' })

export const prerequisitesService = {
  ...crud,

  /**
   * Lista las correlativas de una carrera.
   *
   * `prerequisites` no tiene FK a la carrera (solo a materias), así que se filtra
   * por los IDs de las materias de esa carrera.
   *
   * @param {string[]} subjectIds - IDs de las materias de la carrera.
   * @param {(cached: import('../types/models.js').Prerequisite[]) => void} [onCached]
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Prerequisite[]>>}
   */
  async listForSubjects(subjectIds, onCached) {
    const key = cacheKey('prerequisites')

    if (onCached) {
      const cached = readCache(key, null)
      if (cached) onCached(cached)
    }

    if (subjectIds.length === 0) return { data: [], error: null }

    try {
      const { data, error } = await getSupabase()
        .from('prerequisites')
        .select('*')
        .in('subject_id', subjectIds)

      if (error) {
        return {
          data: readCache(key, []),
          error: translateError(error, 'No se pudieron cargar las correlativas.'),
        }
      }

      writeCache(key, data)
      return { data, error: null }
    } catch (error) {
      return {
        data: readCache(key, []),
        error: translateError(error, 'No se pudieron cargar las correlativas.'),
      }
    }
  },

  /**
   * Agrega una correlativa, validando primero que no cierre un ciclo.
   *
   * @param {Object} params
   * @param {string} params.subject_id - Materia condicionada.
   * @param {string} params.requires_id - Materia requerida.
   * @param {import('../types/models.js').PrerequisiteKind} params.kind
   * @param {import('../types/models.js').Prerequisite[]} params.existing - Correlativas actuales de la carrera.
   * @param {Map<string, string>} params.namesById - id → nombre, para el mensaje de error.
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Prerequisite>>}
   */
  async add({ subject_id, requires_id, kind, existing, namesById }) {
    if (!PREREQUISITE_KIND_VALUES.includes(kind)) {
      return {
        data: null,
        error: `Tipo de correlativa inválido: "${kind}".`,
      }
    }

    if (subject_id === requires_id) {
      return { data: null, error: 'Una materia no puede ser correlativa de sí misma.' }
    }

    // Solo las correlativas del MISMO tipo forman el grafo a validar: el circuito
    // de "para cursar" y el de "para rendir" son independientes entre sí.
    const sameKind = existing.filter((p) => p.kind === kind)
    const cycle = wouldCreateCycle(sameKind, subject_id, requires_id)

    if (cycle) {
      return {
        data: null,
        error: `Esa correlativa crearía un ciclo: ${formatCycle(cycle, namesById)}. Ninguna de esas materias se podría cursar nunca.`,
      }
    }

    const key = cacheKey('prerequisites')
    const previous = readCache(key, [])
    const row = { id: generateId(), subject_id, requires_id, kind }

    writeCache(key, [...previous, row])

    try {
      const { data, error } = await getSupabase()
        .from('prerequisites')
        .insert(row)
        .select()
        .single()

      if (error) {
        writeCache(key, previous)
        return { data: null, error: translateError(error, 'No se pudo agregar la correlativa.') }
      }

      writeCache(key, [...previous, data])
      return { data, error: null }
    } catch (error) {
      writeCache(key, previous)
      return { data: null, error: translateError(error, 'No se pudo agregar la correlativa.') }
    }
  },
}
