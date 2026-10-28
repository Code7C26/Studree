/**
 * Papelera (migración 0006, ver docs/features/trash.md).
 *
 * Mandar a la papelera y restaurar lo hacen funciones SQL (`trash_item`,
 * `restore_item`, security invoker): la cascada a materias y hojas va en UNA
 * transacción y con UNA sola marca de fecha.
 *
 * Borrar para siempre: PRIMERO los archivos de Storage, DESPUÉS las filas. Si
 * se borraran las filas primero y fallara Storage, quedarían archivos que ya
 * nadie puede encontrar ni borrar. Al revés, a lo sumo quedan filas que
 * apuntan a archivos borrados un rato, y se reintenta la próxima vez.
 *
 * Y SOLO si la fila sigue en la papelera: una lista vieja (ej. una hoja
 * restaurada revive su materia) nunca puede borrar algo vivo.
 */

import { getSupabase } from './supabase.client.js'
import { translateError, fetchAllPages } from './crudService.js'
import { notifyDataChanged } from './dataEvents.js'
import { t } from '../lib/i18n/index.js'

/** kind de `list_trash` → tabla. */
export const TABLE_BY_KIND = Object.freeze({ career: 'careers', subject: 'subjects', sheet: 'sheets' })

const BUCKET = 'attachments'
/** La API de Storage borra hasta 1000 rutas por llamada. */
const REMOVE_BATCH = 1000

/** @param {string[]} paths */
async function removeFiles(paths) {
  for (let from = 0; from < paths.length; from += REMOVE_BATCH) {
    const { error } = await getSupabase().storage.from(BUCKET).remove(paths.slice(from, from + REMOVE_BATCH))
    if (error) return error
  }
  return null
}

export const trashService = {
  /**
   * Manda a la papelera una carrera, materia u hoja (con todo lo de abajo).
   * @param {'careers'|'subjects'|'sheets'} table
   * @param {string} id
   * @returns {Promise<import('../types/models.js').ServiceResult<string>>} La marca `deleted_at`.
   */
  async trash(table, id) {
    try {
      const { data, error } = await getSupabase().rpc('trash_item', { p_table: table, p_id: id })
      if (error) return { data: null, error: translateError(error, t('errors.trash.move')) }
      notifyDataChanged()
      return { data, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, t('errors.trash.move')) }
    }
  },

  /**
   * @param {'careers'|'subjects'|'sheets'} table
   * @param {string} id
   * @returns {Promise<import('../types/models.js').ServiceResult<boolean>>}
   */
  async restore(table, id) {
    try {
      const { error } = await getSupabase().rpc('restore_item', { p_table: table, p_id: id })
      if (error) return { data: null, error: translateError(error, t('errors.trash.restore')) }
      notifyDataChanged()
      return { data: true, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, t('errors.trash.restore')) }
    }
  },

  /** @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').TrashItem[]>>} */
  async list() {
    try {
      const { data, error } = await getSupabase().rpc('list_trash')
      if (error) return { data: [], error: translateError(error, t('errors.trash.load')) }
      return { data: data ?? [], error: null }
    } catch (error) {
      return { data: [], error: translateError(error, t('errors.trash.load')) }
    }
  },

  /**
   * Ids de las materias y hojas EN LA PAPELERA que cuelgan de una carrera o
   * materia: lo que "Borrar para siempre" arrastra además del elemento. La
   * página los cruza con lo listado para nombrarlos en la confirmación.
   * @param {'career'|'subject'|'sheet'} kind
   * @param {string} id
   * @returns {Promise<import('../types/models.js').ServiceResult<Set<string>>>}
   */
  async trashedDescendantIds(kind, id) {
    const fallback = t('errors.trash.check')
    if (kind === 'sheet') return { data: new Set(), error: null }
    try {
      const pages = (table, columns, filter) =>
        fetchAllPages((from, to) =>
          filter(getSupabase().from(table).select(columns).not('deleted_at', 'is', null)).order('id').range(from, to),
        )
      const queries =
        kind === 'career'
          ? [
              pages('subjects', 'id', (query) => query.eq('career_id', id)),
              pages('sheets', 'id, subjects!inner(career_id)', (query) => query.eq('subjects.career_id', id)),
            ]
          : [pages('sheets', 'id', (query) => query.eq('subject_id', id))]
      const results = await Promise.all(queries)
      const failed = results.find((result) => result.error)
      if (failed) return { data: null, error: translateError(failed.error, fallback) }
      return { data: new Set(results.flatMap((result) => result.data.map((row) => row.id))), error: null }
    } catch (error) {
      return { data: null, error: translateError(error, fallback) }
    }
  },

  /**
   * Borra para siempre un elemento de la papelera, con sus adjuntos. Si ya no
   * está en la papelera (se restauró, o se borró junto con su padre) no hace
   * nada y devuelve `data: false`.
   * @param {'career'|'subject'|'sheet'} kind
   * @param {string} id
   * @returns {Promise<import('../types/models.js').ServiceResult<boolean>>}
   */
  async purgeForever(kind, id) {
    const fallback = t('errors.trash.purge')
    const table = TABLE_BY_KIND[kind]
    try {
      // Primero confirmar que sigue en la papelera: recién ahí se tocan archivos.
      const { data: row, error: rowError } = await getSupabase()
        .from(table)
        .select('id')
        .eq('id', id)
        .not('deleted_at', 'is', null)
        .maybeSingle()
      if (rowError) return { data: null, error: translateError(rowError, fallback) }
      if (!row) return { data: false, error: null }

      const { data: paths, error: pathsError } = await getSupabase().rpc('attachment_paths_for', { p_kind: kind, p_id: id })
      if (pathsError) return { data: null, error: translateError(pathsError, fallback) }

      const filesError = await removeFiles(paths ?? [])
      if (filesError) return { data: null, error: translateError(filesError, fallback) }

      // El filtro `deleted_at` también en el DELETE: si se restauró entre medio, no se borra.
      const { error } = await getSupabase().from(table).delete().eq('id', id).not('deleted_at', 'is', null)
      if (error) return { data: null, error: translateError(error, fallback) }
      return { data: true, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, fallback) }
    }
  },

  /**
   * Borra lo que lleva más de `days` días en la papelera. Lo llama
   * `useTrashPurge` una vez por sesión; un error corta y se reintenta la próxima.
   * @param {number} [days=30]
   * @returns {Promise<import('../types/models.js').ServiceResult<number>>}
   */
  async purgeExpired(days = 30) {
    try {
      const { data, error } = await getSupabase().rpc('list_expired_trash', { p_days: days })
      if (error) return { data: 0, error: translateError(error, t('errors.trash.purgeExpired')) }
      let purged = 0
      for (const item of data ?? []) {
        const { data: deleted, error: purgeError } = await this.purgeForever(item.kind, item.id)
        if (purgeError) return { data: purged, error: purgeError }
        if (deleted) purged += 1
      }
      return { data: purged, error: null }
    } catch (error) {
      return { data: 0, error: translateError(error, t('errors.trash.purgeExpired')) }
    }
  },
}
