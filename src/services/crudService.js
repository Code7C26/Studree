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
import { t } from '../lib/i18n/index.js'

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
    return t('errors.supabase.sessionExpired')
  }
  if (/row-level security|violates row-level/i.test(message)) {
    return t('errors.supabase.forbidden')
  }
  if (/duplicate key|already exists/i.test(message)) {
    return t('errors.supabase.duplicate')
  }
  if (/does not exist|schema cache/i.test(message)) {
    return t('errors.supabase.migration')
  }
  if (/Failed to fetch|NetworkError|fetch failed/i.test(message)) {
    return t('errors.supabase.offline')
  }
  return message || fallback
}

/**
 * Máximo de filas que PostgREST devuelve por consulta (config por defecto de
 * Supabase). Una consulta sin paginar se CORTA acá sin avisar: con muchas
 * hojas, el explorador quedaba incompleto. Por eso las listas paginan.
 */
const PAGE_SIZE = 1000

/**
 * Ejecuta una consulta paginando con `.range()` hasta traer todas las filas.
 * @param {(from: number, to: number) => PromiseLike<{data: Object[]|null, error: Object|null}>} runPage
 * @returns {Promise<{data: Object[], error: Object|null}>}
 */
export async function fetchAllPages(runPage) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await runPage(from, from + PAGE_SIZE - 1)
    if (error) return { data: rows, error }
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null }
  }
}

/**
 * Crea un service CRUD para una tabla.
 *
 * @param {Object} config
 * @param {string} config.table - Nombre de la tabla en Postgres.
 * @param {string} [config.parentColumn] - Columna de FK al padre (ej. 'career_id'). Si falta, la colección es global.
 * @param {string} [config.orderBy='position'] - Columna de orden.
 * @param {boolean} [config.notifies=true] - `false` para tablas que no forman
 *   parte del árbol del explorador (ej. tareas del Inicio): sus altas, cambios y
 *   bajas no disparan `notifyDataChanged()`, así tildar una tarea no recarga el
 *   explorador.
 * @param {boolean} [config.softDelete=false] - Tabla con papelera (0006): las lecturas solo traen filas con `deleted_at` NULL.
 * @returns {Object} Service con list / get / create / update / remove.
 */
export function createCrudService({ table, parentColumn, orderBy = 'position', notifies = true, softDelete = false }) {
  /** @param {string} [parentId] */
  const keyFor = (parentId) => cacheKey(table, parentId)

  /** Solo filas vivas en tablas con papelera (ver docs/features/trash.md). */
  const alive = (query) => (softDelete ? query.is('deleted_at', null) : query)

  const service = {
    /**
     * Lista los registros, opcionalmente filtrados por padre.
     * Devuelve lo que haya en cache de inmediato vía `onCached` (para pintar sin
     * esperar la red) y resuelve con lo que responda Supabase.
     *
     * Pagina de a 1000 filas (límite de PostgREST) hasta traer todo.
     *
     * @param {string} [parentId]
     * @param {(cached: Object[]) => void} [onCached] - Se llama con la cache antes de la red.
     * @param {{columns?: string}} [options] - `columns`: columnas a traer (ej. sin
     *   `content_md`). Con columnas parciales la cache usa otra clave, para no
     *   mezclar filas incompletas con las completas.
     * @returns {Promise<import('../types/models.js').ServiceResult<Object[]>>}
     */
    async list(parentId, onCached, { columns = '*' } = {}) {
      const key = columns === '*' ? keyFor(parentId) : cacheKey(`${table}[${columns.replace(/\s/g, '')}]`, parentId)

      if (onCached) {
        const cached = readCache(key, null)
        if (cached) onCached(cached)
      }

      try {
        const { data, error } = await fetchAllPages((from, to) => {
          let query = alive(getSupabase().from(table).select(columns))
          if (parentColumn && parentId) query = query.eq(parentColumn, parentId)
          return query.order(orderBy, { ascending: true }).order('id', { ascending: true }).range(from, to)
        })
        if (error) return { data: readCache(key, []), error: translateError(error, t('errors.crud.loadList')) }

        writeCache(key, data)
        return { data, error: null }
      } catch (error) {
        return { data: readCache(key, []), error: translateError(error, t('errors.crud.loadList')) }
      }
    },

    /**
     * Trae un registro por ID.
     * @param {string} id
     * @returns {Promise<import('../types/models.js').ServiceResult<Object>>}
     */
    async get(id) {
      try {
        const { data, error } = await alive(getSupabase().from(table).select('*').eq('id', id)).maybeSingle()
        if (error) return { data: null, error: translateError(error, t('errors.crud.loadRecord')) }
        return { data, error: null }
      } catch (error) {
        return { data: null, error: translateError(error, t('errors.crud.loadRecord')) }
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
     * @param {{cache?: boolean}} [options] - `cache: false`: no tocar la cache
     *   (importación masiva, o tablas cuya cache nadie lee). Sin esto, cada alta
     *   reescribe la lista entera del padre en localStorage: con cientos de hojas
     *   importadas el costo crece al cuadrado.
     * @returns {Promise<import('../types/models.js').ServiceResult<Object>>}
     */
    async create(values, parentId, { cache = true } = {}) {
      const key = keyFor(parentId)
      const optimistic = { id: generateId(), ...values }
      const previous = cache ? readCache(key, []) : []
      const write = cache ? (rows) => writeCache(key, rows) : () => {}

      write([...previous, optimistic])

      try {
        const { data, error } = await getSupabase().from(table).insert(optimistic).select().single()

        if (error) {
          write(previous) // revertir
          return { data: null, error: translateError(error, t('errors.crud.create')) }
        }

        write([...previous, data])
        if (notifies) notifyDataChanged()
        return { data, error: null }
      } catch (error) {
        write(previous)
        return { data: null, error: translateError(error, t('errors.crud.create')) }
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
          return { data: null, error: translateError(error, t('errors.crud.save')) }
        }

        writeCache(key, previous.map((row) => (row.id === id ? data : row)))
        if (notifies && !options.silent) notifyDataChanged()
        return { data, error: null }
      } catch (error) {
        writeCache(key, previous)
        return { data: null, error: translateError(error, t('errors.crud.save')) }
      }
    },

    /**
     * Guarda las posiciones manuales de VARIOS nodos del canvas en un solo
     * request (RPC `save_node_positions`, ADR-016). Antes era un UPDATE por
     * nodo: "congelar" un canvas de 40 materias eran 40 requests.
     *
     * Es silencioso: mover nodos no cambia la estructura del árbol, así que no
     * dispara la recarga del explorador. La RPC solo acepta tablas/columnas de
     * una whitelist y corre con RLS (security invoker).
     *
     * @param {Array<{id: string, x: number, y: number}>} moves
     * @param {string} [parentId] - Para actualizar la cache de ese padre.
     * @param {[string, string]} [columns=['pos_x','pos_y']]
     * @returns {Promise<import('../types/models.js').ServiceResult<boolean>>}
     */
    async savePositions(moves, parentId, columns = ['pos_x', 'pos_y']) {
      if (moves.length === 0) return { data: true, error: null }
      const [xColumn, yColumn] = columns

      try {
        const { error } = await getSupabase().rpc('save_node_positions', {
          p_table: table,
          p_x_column: xColumn,
          p_y_column: yColumn,
          p_moves: moves.map(({ id, x, y }) => ({ id, x, y })),
        })
        if (error) return { data: null, error: translateError(error, t('errors.crud.savePosition')) }

        const key = keyFor(parentId)
        const byId = new Map(moves.map((move) => [move.id, move]))
        writeCache(
          key,
          readCache(key, []).map((row) =>
            byId.has(row.id) ? { ...row, [xColumn]: byId.get(row.id).x, [yColumn]: byId.get(row.id).y } : row,
          ),
        )
        return { data: true, error: null }
      } catch (error) {
        return { data: null, error: translateError(error, t('errors.crud.savePosition')) }
      }
    },

    /**
     * Borra un registro. La cascada a los hijos la hace Postgres
     * (`ON DELETE CASCADE`), no este service.
     * @param {string} id
     * @param {string} [parentId]
     * @param {{cache?: boolean}} [options] - `cache: false`: no tocar la cache (ver `create`).
     * @returns {Promise<import('../types/models.js').ServiceResult<boolean>>}
     */
    async remove(id, parentId, { cache = true } = {}) {
      const key = keyFor(parentId)
      const previous = cache ? readCache(key, []) : []
      const write = cache ? (rows) => writeCache(key, rows) : () => {}

      write(previous.filter((row) => row.id !== id))

      try {
        const { error } = await getSupabase().from(table).delete().eq('id', id)

        if (error) {
          write(previous)
          return { data: null, error: translateError(error, t('errors.crud.delete')) }
        }

        if (notifies) notifyDataChanged()
        return { data: true, error: null }
      } catch (error) {
        write(previous)
        return { data: null, error: translateError(error, t('errors.crud.delete')) }
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
        const { data, error } = await fetchAllPages((from, to) =>
          alive(getSupabase().from(table).select(columns).in(parentColumn, parentIds))
            .order(orderBy, { ascending: true })
            .order('id', { ascending: true })
            .range(from, to),
        )
        if (error) return { data: [], error: translateError(error, t('errors.crud.loadList')) }
        return { data, error: null }
      } catch (error) {
        return { data: [], error: translateError(error, t('errors.crud.loadList')) }
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
        if (error) return { data: null, error: translateError(error, t('errors.crud.reorder')) }

        for (const parentId of parentIds) {
          const key = keyFor(parentId)
          writeCache(key, readCache(key, []).map((row) => ({ ...row, ...values })))
        }
        return { data: true, error: null }
      } catch (error) {
        return { data: null, error: translateError(error, t('errors.crud.reorder')) }
      }
    },
  }

  return service
}
