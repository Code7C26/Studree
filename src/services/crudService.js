/**
 * Fábrica de services CRUD contra Supabase con cache optimista (ADR-007).
 *
 * Las 6 entidades (careers, subjects, units, topics, sheets, prerequisites)
 * comparten exactamente el mismo ciclo: leer de cache → consultar Supabase →
 * reconciliar; y escribir en cache → mandar a Supabase → revertir si falla.
 * Se centraliza acá para que esa lógica exista UNA vez y no seis, y para que
 * cada service concreto solo agregue lo suyo (ej. la validación DAG en
 * prerequisites).
 *
 * Contrato de retorno (ver docs/API_DOCS.md): `{ data, error }`, donde `error`
 * ya es un string listo para mostrar. Los componentes nunca ven el error crudo
 * de supabase-js.
 */

import { getSupabase } from './supabase.client.js'
import { readCache, writeCache, cacheKey } from './cache.service.js'
import { generateId } from '../lib/id.js'
import { notifyDataChanged } from './dataEvents.js'

/**
 * Traduce un error de supabase-js a un mensaje accionable en castellano.
 * @param {{message?: string, code?: string}|null} error
 * @param {string} fallback
 * @returns {string}
 */
export function translateError(error, fallback) {
  if (!error) return fallback
  const message = error.message ?? ''

  if (/JWT|not authenticated|session/i.test(message)) {
    return 'Tu sesión expiró. Volvé a iniciar sesión.'
  }
  if (/row-level security|violates row-level/i.test(message)) {
    return 'No tenés permiso para hacer esto.'
  }
  if (/duplicate key|already exists/i.test(message)) {
    return 'Ya existe un registro igual.'
  }
  if (/does not exist|schema cache/i.test(message)) {
    return 'Falta aplicar una migración de la base (ver supabase/migrations/, en orden: 0001, 0002…).'
  }
  if (/Failed to fetch|NetworkError|fetch failed/i.test(message)) {
    return 'Sin conexión con el servidor. Se guardó localmente y se reintentará.'
  }
  return message || fallback
}

/**
 * Crea un service CRUD para una tabla.
 *
 * @param {Object} config
 * @param {string} config.table - Nombre de la tabla en Postgres.
 * @param {string} [config.parentColumn] - Columna de FK al padre (ej. 'career_id'). Si falta, la colección es global.
 * @param {string} [config.orderBy='position'] - Columna de orden.
 * @returns {Object} Service con list / get / create / update / remove.
 */
export function createCrudService({ table, parentColumn, orderBy = 'position' }) {
  /** @param {string} [parentId] */
  const keyFor = (parentId) => cacheKey(table, parentId)

  const service = {
    /**
     * Lista los registros, opcionalmente filtrados por padre.
     * Devuelve lo que haya en cache de inmediato vía `onCached` (para pintar sin
     * esperar la red) y resuelve con lo que responda Supabase.
     *
     * @param {string} [parentId]
     * @param {(cached: Object[]) => void} [onCached] - Se llama con la cache antes de la red.
     * @returns {Promise<import('../types/models.js').ServiceResult<Object[]>>}
     */
    async list(parentId, onCached) {
      const key = keyFor(parentId)

      if (onCached) {
        const cached = readCache(key, null)
        if (cached) onCached(cached)
      }

      try {
        let query = getSupabase().from(table).select('*')
        if (parentColumn && parentId) query = query.eq(parentColumn, parentId)

        const { data, error } = await query.order(orderBy, { ascending: true })
        if (error) return { data: readCache(key, []), error: translateError(error, 'No se pudo cargar la lista.') }

        writeCache(key, data)
        return { data, error: null }
      } catch (error) {
        return { data: readCache(key, []), error: translateError(error, 'No se pudo cargar la lista.') }
      }
    },

    /**
     * Trae un registro por ID.
     * @param {string} id
     * @returns {Promise<import('../types/models.js').ServiceResult<Object>>}
     */
    async get(id) {
      try {
        const { data, error } = await getSupabase().from(table).select('*').eq('id', id).maybeSingle()
        if (error) return { data: null, error: translateError(error, 'No se pudo cargar el registro.') }
        return { data, error: null }
      } catch (error) {
        return { data: null, error: translateError(error, 'No se pudo cargar el registro.') }
      }
    },

    /**
     * Crea un registro. Optimista: el ID se genera en el cliente y la fila entra
     * en la cache antes de que Supabase confirme.
     *
     * `user_id` NO se manda nunca: lo pone Postgres con `default auth.uid()`
     * (ver supabase/migrations/0001_init.sql).
     *
     * @param {Object} values - Campos de la fila (sin id ni user_id).
     * @param {string} [parentId] - Para saber qué entrada de cache actualizar.
     * @returns {Promise<import('../types/models.js').ServiceResult<Object>>}
     */
    async create(values, parentId) {
      const key = keyFor(parentId)
      const optimistic = { id: generateId(), ...values }
      const previous = readCache(key, [])

      writeCache(key, [...previous, optimistic])

      try {
        const { data, error } = await getSupabase().from(table).insert(optimistic).select().single()

        if (error) {
          writeCache(key, previous) // revertir
          return { data: null, error: translateError(error, 'No se pudo crear.') }
        }

        writeCache(key, [...previous, data])
        notifyDataChanged()
        return { data, error: null }
      } catch (error) {
        writeCache(key, previous)
        return { data: null, error: translateError(error, 'No se pudo crear.') }
      }
    },

    /**
     * Actualiza un registro (optimista, con reversión si falla).
     * @param {string} id
     * @param {Object} values
     * @param {string} [parentId]
     * @param {{silent?: boolean}} [options] - `silent`: no emitir el aviso de
     *   cambio de estructura (para guardados que no la cambian, ej. posiciones).
     * @returns {Promise<import('../types/models.js').ServiceResult<Object>>}
     */
    async update(id, values, parentId, options = {}) {
      const key = keyFor(parentId)
      const previous = readCache(key, [])

      writeCache(key, previous.map((row) => (row.id === id ? { ...row, ...values } : row)))

      try {
        const { data, error } = await getSupabase().from(table).update(values).eq('id', id).select().single()

        if (error) {
          writeCache(key, previous)
          return { data: null, error: translateError(error, 'No se pudo guardar.') }
        }

        writeCache(key, previous.map((row) => (row.id === id ? data : row)))
        if (!options.silent) notifyDataChanged()
        return { data, error: null }
      } catch (error) {
        writeCache(key, previous)
        return { data: null, error: translateError(error, 'No se pudo guardar.') }
      }
    },

    /**
     * Guarda la posición manual de un nodo del canvas (ADR-012). Es `update`
     * silencioso: mover un nodo no cambia la estructura del árbol, así que no
     * dispara la recarga del explorador.
     *
     * @param {string} id
     * @param {{x: number, y: number}} position
     * @param {string} [parentId]
     * @param {[string, string]} [columns=['pos_x','pos_y']]
     * @returns {Promise<import('../types/models.js').ServiceResult<Object>>}
     */
    savePosition(id, { x, y }, parentId, columns = ['pos_x', 'pos_y']) {
      return service.update(id, { [columns[0]]: x, [columns[1]]: y }, parentId, { silent: true })
    },

    /**
     * Borra un registro. La cascada a los hijos la hace Postgres
     * (`ON DELETE CASCADE`), no este service.
     * @param {string} id
     * @param {string} [parentId]
     * @returns {Promise<import('../types/models.js').ServiceResult<boolean>>}
     */
    async remove(id, parentId) {
      const key = keyFor(parentId)
      const previous = readCache(key, [])

      writeCache(key, previous.filter((row) => row.id !== id))

      try {
        const { error } = await getSupabase().from(table).delete().eq('id', id)

        if (error) {
          writeCache(key, previous)
          return { data: null, error: translateError(error, 'No se pudo eliminar.') }
        }

        notifyDataChanged()
        return { data: true, error: null }
      } catch (error) {
        writeCache(key, previous)
        return { data: null, error: translateError(error, 'No se pudo eliminar.') }
      }
    },

    /**
     * Lista los registros de VARIOS padres en una sola consulta (`IN`).
     * Evita el patrón N+1 (una consulta por padre) del explorador, los canvas
     * y el export. No usa cache: la cache está indexada por un solo padre.
     *
     * @param {string[]} parentIds
     * @param {string} [columns='*'] - Columnas a traer (ej. sin `content_md` si no hace falta).
     * @returns {Promise<import('../types/models.js').ServiceResult<Object[]>>}
     */
    async listByParents(parentIds, columns = '*') {
      if (!parentColumn) throw new Error(`[${table}] listByParents requiere parentColumn.`)
      if (parentIds.length === 0) return { data: [], error: null }

      try {
        const { data, error } = await getSupabase()
          .from(table)
          .select(columns)
          .in(parentColumn, parentIds)
          .order(orderBy, { ascending: true })
        if (error) return { data: [], error: translateError(error, 'No se pudo cargar la lista.') }
        return { data, error: null }
      } catch (error) {
        return { data: [], error: translateError(error, 'No se pudo cargar la lista.') }
      }
    },

    /**
     * Pone en NULL las posiciones manuales de todos los hijos de esos padres:
     * el canvas vuelve al auto-layout de dagre ("Reordenar", ADR-012).
     *
     * @param {string[]} parentIds
     * @param {string[]} [columns=['pos_x','pos_y']]
     * @returns {Promise<import('../types/models.js').ServiceResult<boolean>>}
     */
    async clearPositions(parentIds, columns = ['pos_x', 'pos_y']) {
      if (!parentColumn) throw new Error(`[${table}] clearPositions requiere parentColumn.`)
      if (parentIds.length === 0) return { data: true, error: null }

      const values = Object.fromEntries(columns.map((column) => [column, null]))
      try {
        const { error } = await getSupabase().from(table).update(values).in(parentColumn, parentIds)
        if (error) return { data: null, error: translateError(error, 'No se pudo reordenar.') }

        for (const parentId of parentIds) {
          const key = keyFor(parentId)
          writeCache(key, readCache(key, []).map((row) => ({ ...row, ...values })))
        }
        return { data: true, error: null }
      } catch (error) {
        return { data: null, error: translateError(error, 'No se pudo reordenar.') }
      }
    },
  }

  return service
}
