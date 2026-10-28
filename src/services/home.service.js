/**
 * Lecturas propias del Inicio (ver docs/features/home.md).
 *
 * "Seguí donde dejaste" = la hoja con mayor `updated_at` del usuario (solo
 * cambia con el contenido, migración 0003). No se pide `title`: en La Carpeta
 * las hojas no tienen título (migración 0004), así esta consulta funciona antes
 * y después de esa migración. El `content_md` de esa ÚNICA hoja se reduce acá a
 * un preview corto; la cache guarda solo el preview, no el contenido.
 */

import { getSupabase } from './supabase.client.js'
import { readCache, writeCache, cacheKey } from './cache.service.js'
import { translateError } from './crudService.js'
import { buildPreview } from '../lib/home/preview.js'
import { t } from '../lib/i18n/index.js'

const LAST_SHEET_KEY = cacheKey('home:lastSheet')

export const homeService = {
  /**
   * @param {(cached: import('../types/models.js').LastSheet|null) => void} [onCached]
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').LastSheet|null>>}
   */
  async getLastEditedSheet(onCached) {
    if (onCached) {
      const cached = readCache(LAST_SHEET_KEY, undefined)
      if (cached !== undefined) onCached(cached)
    }

    try {
      const { data, error } = await getSupabase()
        .from('sheets')
        // `!inner` + filtro en la materia: una hoja viva dentro de una materia en
        // la papelera (ej. autosave desde otra pestaña) no aparece.
        .select('id, subject_id, updated_at, content_md, subjects!inner(name, color)')
        .is('deleted_at', null)
        .is('subjects.deleted_at', null)
        .order('updated_at', { ascending: false })
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (error) {
        return { data: readCache(LAST_SHEET_KEY, null), error: translateError(error, t('errors.home.lastSheet')) }
      }

      const sheet = data
        ? {
            id: data.id,
            subject_id: data.subject_id,
            updated_at: data.updated_at,
            subject_name: data.subjects?.name ?? t('home.continue.subjectFallback'),
            subject_color: data.subjects?.color ?? null,
            preview: buildPreview(data.content_md),
          }
        : null
      writeCache(LAST_SHEET_KEY, sheet)
      return { data: sheet, error: null }
    } catch (error) {
      return { data: readCache(LAST_SHEET_KEY, null), error: translateError(error, t('errors.home.lastSheet')) }
    }
  },
}
