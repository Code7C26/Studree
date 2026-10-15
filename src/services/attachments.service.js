/**
 * Adjuntos de las hojas (migración 0006, ver docs/features/attachments.md).
 *
 * Bucket PRIVADO `attachments`, ruta `<user_id>/<attachment_id>/<nombre>`. Se
 * sube el archivo y recién después se inserta la fila: si la fila falla, se
 * borra el archivo (nunca queda una fila apuntando a nada).
 *
 * Los archivos se ven con links FIRMADOS de 1 h, cacheados en memoria por id.
 * Una subida en curso queda registrada como "pendiente": el editor muestra la
 * imagen con "Subiendo…" y `signedUrl` espera a que termine.
 */

import { getSupabase } from './supabase.client.js'
import { createCrudService, translateError } from './crudService.js'
import { generateId } from '../lib/id.js'
import { listInChunks } from '../lib/chunk.js'
import { storageSafeName } from '../lib/attachments/files.js'
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_LABEL } from '../constants/attachmentLimits.js'

const BUCKET = 'attachments'
const SIGNED_URL_SECONDS = 60 * 60
/** Se renueva un poco antes de que venza. */
const SIGNED_URL_TTL_MS = 55 * 60 * 1000
/** Ids por consulta en `listBySheets`: un `IN` con cientos de uuids pasa el largo máximo de la URL. */
const SHEET_IDS_PER_QUERY = 100

const crud = createCrudService({ table: 'attachments', parentColumn: 'sheet_id', orderBy: 'created_at', notifies: false })
/** La cache `attachments:<hoja>` no la lee nadie (la carpeta usa `listBySheets`): altas y bajas no la tocan. */
const NO_CACHE = { cache: false }

/** id → { url, expiresAt } */
const signedUrls = new Map()
/** id → promesa de la subida en curso */
const pendingUploads = new Map()

async function currentUserId() {
  const { data } = await getSupabase().auth.getSession()
  return data.session?.user?.id ?? null
}

export const attachmentsService = {
  /**
   * Sube un archivo a una hoja (que ya tiene que existir en Supabase).
   * NO es `async` a propósito: registra la subida como pendiente en el mismo
   * tick, porque el editor inserta la referencia justo después.
   * @param {string} sheetId
   * @param {Blob & {name?: string, type?: string}} file
   * @param {{id?: string, name?: string}} [options] - `id`: para insertar la
   *   referencia en el editor ANTES de que termine la subida.
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Attachment>>}
   */
  upload(sheetId, file, { id = generateId(), name = file.name ?? 'archivo' } = {}) {
    const task = (async () => {
      if (file.size > MAX_ATTACHMENT_BYTES) return { data: null, error: `«${name}» pesa más de ${MAX_ATTACHMENT_LABEL}.` }
      if (file.size === 0) return { data: null, error: `«${name}» está vacío.` }
      const fallback = `No se pudo subir «${name}».`
      try {
        const userId = await currentUserId()
        if (!userId) return { data: null, error: 'Tu sesión expiró. Volvé a iniciar sesión.' }
        const path = `${userId}/${id}/${storageSafeName(name)}`
        const contentType = file.type || 'application/octet-stream'

        const { error: uploadError } = await getSupabase().storage.from(BUCKET).upload(path, file, { contentType, upsert: false })
        if (uploadError) return { data: null, error: translateError(uploadError, fallback) }

        const { data, error } = await crud.create(
          { id, sheet_id: sheetId, name, mime_type: contentType, size_bytes: file.size, storage_path: path },
          sheetId,
          NO_CACHE,
        )
        if (error) {
          await getSupabase().storage.from(BUCKET).remove([path])
          return { data: null, error }
        }
        return { data, error: null }
      } catch (error) {
        return { data: null, error: translateError(error, fallback) }
      }
    })()
    pendingUploads.set(id, task)
    return task.finally(() => pendingUploads.delete(id))
  },

  /** @param {string} id */
  isUploading(id) {
    return pendingUploads.has(id)
  },

  /**
   * Adjuntos de varias hojas, de a tramos de 100 ids (ver `lib/chunk.js`).
   * @param {string[]} sheetIds
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').Attachment[]>>}
   */
  listBySheets(sheetIds) {
    return listInChunks(sheetIds, SHEET_IDS_PER_QUERY, (ids) => crud.listByParents(ids))
  },

  /**
   * Link firmado (1 h) para ver o descargar un adjunto. null si no existe o no es del usuario.
   * @param {string} id
   * @returns {Promise<string|null>}
   */
  async signedUrl(id) {
    const pending = pendingUploads.get(id)
    if (pending) await pending
    const cached = signedUrls.get(id)
    if (cached && cached.expiresAt > Date.now()) return cached.url
    try {
      const { data: row } = await getSupabase().from('attachments').select('storage_path').eq('id', id).maybeSingle()
      if (!row) return null
      const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(row.storage_path, SIGNED_URL_SECONDS)
      if (error || !data?.signedUrl) return null
      signedUrls.set(id, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_TTL_MS })
      return data.signedUrl
    } catch {
      return null
    }
  },

  /**
   * Borra un adjunto para siempre (archivo + fila). No pasa por la papelera.
   * @param {import('../types/models.js').Attachment} attachment
   * @returns {Promise<import('../types/models.js').ServiceResult<boolean>>}
   */
  async remove(attachment) {
    const fallback = `No se pudo borrar «${attachment.name}».`
    try {
      const { error: filesError } = await getSupabase().storage.from(BUCKET).remove([attachment.storage_path])
      if (filesError) return { data: null, error: translateError(filesError, fallback) }
      signedUrls.delete(attachment.id)
      return crud.remove(attachment.id, attachment.sheet_id, NO_CACHE)
    } catch (error) {
      return { data: null, error: translateError(error, fallback) }
    }
  },

  /**
   * Descarga el archivo (export `.zip`).
   * @param {string} storagePath
   * @returns {Promise<Blob|null>}
   */
  async download(storagePath) {
    try {
      const { data, error } = await getSupabase().storage.from(BUCKET).download(storagePath)
      return error ? null : data
    } catch {
      return null
    }
  },
}
