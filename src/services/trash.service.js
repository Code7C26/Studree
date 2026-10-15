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
 */

import { getSupabase } from './supabase.client.js'
import { translateError } from './crudService.js'
import { notifyDataChanged } from './dataEvents.js'

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
      if (error) return { data: null, error: translateError(error, 'No se pudo mover a la papelera.') }
      notifyDataChanged()
      return { data, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, 'No se pudo mover a la papelera.') }
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
      if (error) return { data: null, error: translateError(error, 'No se pudo restaurar.') }
      notifyDataChanged()
      return { data: true, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, 'No se pudo restaurar.') }
    }
  },

  /** @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').TrashItem[]>>} */
  async list() {
    try {
      const { data, error } = await getSupabase().rpc('list_trash')
      if (error) return { data: [], error: translateError(error, 'No se pudo cargar la papelera.') }
      return { data: data ?? [], error: null }
    } catch (error) {
      return { data: [], error: translateError(error, 'No se pudo cargar la papelera.') }
    }
  },

  /**
   * Borra para siempre un elemento de la papelera, con sus adjuntos.
   * @param {'career'|'subject'|'sheet'} kind
   * @param {string} id
   * @returns {Promise<import('../types/models.js').ServiceResult<boolean>>}
   */
  async purgeForever(kind, id) {
    const fallback = 'No se pudo borrar para siempre.'
    try {
      const { data: paths, error: pathsError } = await getSupabase().rpc('attachment_paths_for', { p_kind: kind, p_id: id })
      if (pathsError) return { data: null, error: translateError(pathsError, fallback) }

      const filesError = await removeFiles(paths ?? [])
      if (filesError) return { data: null, error: translateError(filesError, fallback) }

      const { error } = await getSupabase().from(TABLE_BY_KIND[kind]).delete().eq('id', id)
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
      if (error) return { data: 0, error: translateError(error, 'No se pudo vaciar lo vencido.') }
      let purged = 0
      for (const item of data ?? []) {
        const { error: purgeError } = await this.purgeForever(item.kind, item.id)
        if (purgeError) return { data: purged, error: purgeError }
        purged += 1
      }
      return { data: purged, error: null }
    } catch (error) {
      return { data: 0, error: translateError(error, 'No se pudo vaciar lo vencido.') }
    }
  },
}
