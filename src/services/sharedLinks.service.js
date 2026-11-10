/**
 * Links para compartir una materia (migración 0010, Fase 15).
 * Ver docs/features/share.md y docs/API_DOCS.md.
 *
 * Sin cache: el link es una acción puntual. La lectura pública la hace la RPC
 * `get_shared_subject`, que no necesita sesión.
 */

import { getSupabase } from './supabase.client.js'
import { translateError } from './crudService.js'
import { isValidToken, normalizeToken, newToken } from '../lib/share/token.js'
import { t } from '../lib/i18n/index.js'

/**
 * @typedef {import('../types/models.js').SharedLink} SharedLink
 * @typedef {import('../types/models.js').PublicSubject} PublicSubject
 */

export const sharedLinksService = {
  /**
   * El link activo de una materia (o `null` si no hay).
   * @param {string} subjectId
   * @returns {Promise<import('../types/models.js').ServiceResult<SharedLink|null>>}
   */
  async getForSubject(subjectId) {
    const fallback = t('errors.share.load')
    try {
      const { data, error } = await getSupabase()
        .from('shared_links')
        .select('*')
        .eq('subject_id', subjectId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) return { data: null, error: translateError(error, fallback) }
      return { data: data ?? null, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, fallback) }
    }
  },

  /**
   * Reusa el link activo o genera uno nuevo. Si dos pestañas compiten, la que
   * pierde el índice único vuelve a leer el link que ganó.
   * @param {string} subjectId
   * @returns {Promise<import('../types/models.js').ServiceResult<SharedLink>>}
   */
  async create(subjectId) {
    const fallback = t('errors.share.create')
    const existing = await this.getForSubject(subjectId)
    if (existing.data) return { data: existing.data, error: null }
    try {
      const { data, error } = await getSupabase()
        .from('shared_links')
        .insert({ subject_id: subjectId, token: newToken() })
        .select('*')
        .single()
      if (error) {
        if (error.code === '23505') {
          const raced = await this.getForSubject(subjectId)
          if (raced.data) return { data: raced.data, error: null }
        }
        return { data: null, error: translateError(error, fallback) }
      }
      return { data, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, fallback) }
    }
  },

  /**
   * Revoca el link (deja de funcionar de inmediato).
   * @param {string} id
   * @returns {Promise<import('../types/models.js').ServiceResult<boolean>>}
   */
  async revoke(id) {
    try {
      const { error } = await getSupabase()
        .from('shared_links')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
      if (error) return { data: null, error: translateError(error, t('errors.share.revoke')) }
      return { data: true, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, t('errors.share.revoke')) }
    }
  },

  /**
   * Materia compartida a partir del token, sin sesión.
   * @param {string} token
   * @returns {Promise<import('../types/models.js').ServiceResult<PublicSubject|null>>}
   */
  async getPublic(token) {
    const fallback = t('errors.share.open')
    const clean = normalizeToken(token)
    if (!isValidToken(clean)) return { data: null, error: null }
    try {
      const { data, error } = await getSupabase().rpc('get_shared_subject', { p_token: clean })
      if (error) return { data: null, error: translateError(error, fallback) }
      return { data: data ?? null, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, fallback) }
    }
  },
}
