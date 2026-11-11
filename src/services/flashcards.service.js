/**
 * Tarjetas de repaso (migración 0010, Fase 15). Ver docs/features/flashcards.md.
 *
 * Sin cache (no son parte del árbol del explorador). El repaso calcula la caja y
 * el próximo vencimiento con `lib/flashcards/srs.js` y lo guarda en UNA escritura.
 */

import { getSupabase } from './supabase.client.js'
import { fetchAllPages, translateError } from './crudService.js'
import { nextReview } from '../lib/flashcards/srs.js'
import { t } from '../lib/i18n/index.js'

/**
 * @typedef {import('../types/models.js').Flashcard} Flashcard
 */


export const flashcardsService = {
  /**
   * Todas las tarjetas de una materia, de la más vieja a la más nueva.
   * @param {string} subjectId
   * @returns {Promise<import('../types/models.js').ServiceResult<Flashcard[]>>}
   */
  async listBySubject(subjectId) {
    const fallback = t('errors.flashcards.load')
    try {
      const { data, error } = await fetchAllPages((from, to) =>
        getSupabase()
          .from('flashcards')
          .select('*')
          .eq('subject_id', subjectId)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      )
      if (error) return { data: [], error: translateError(error, fallback) }
      return { data, error: null }
    } catch (error) {
      return { data: [], error: translateError(error, fallback) }
    }
  },

  /**
   * @param {{ subject_id: string, sheet_id?: string|null, front: string, back: string }} values
   * @returns {Promise<import('../types/models.js').ServiceResult<Flashcard>>}
   */
  async create(values) {
    try {
      const { data, error } = await getSupabase()
        .from('flashcards')
        .insert({
          subject_id: values.subject_id,
          sheet_id: values.sheet_id ?? null,
          front: values.front.trim(),
          back: values.back.trim(),
        })
        .select('*')
        .single()
      if (error) return { data: null, error: translateError(error, t('errors.flashcards.create')) }
      return { data, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, t('errors.flashcards.create')) }
    }
  },

  /**
   * @param {string} id
   * @param {{ front?: string, back?: string }} values
   * @returns {Promise<import('../types/models.js').ServiceResult<Flashcard>>}
   */
  async update(id, values) {
    /** @type {{front?: string, back?: string}} */
    const patch = {}
    if (typeof values.front === 'string') patch.front = values.front.trim()
    if (typeof values.back === 'string') patch.back = values.back.trim()
    try {
      const { data, error } = await getSupabase()
        .from('flashcards')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()
      if (error) return { data: null, error: translateError(error, t('errors.flashcards.save')) }
      return { data, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, t('errors.flashcards.save')) }
    }
  },

  /**
   * @param {string} id
   * @returns {Promise<import('../types/models.js').ServiceResult<boolean>>}
   */
  async remove(id) {
    try {
      const { error } = await getSupabase().from('flashcards').delete().eq('id', id)
      if (error) return { data: null, error: translateError(error, t('errors.flashcards.remove')) }
      return { data: true, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, t('errors.flashcards.remove')) }
    }
  },

  /**
   * Guarda el resultado de un repaso. Lee la caja actual y escribe `box`,
   * `due_at` y `last_reviewed_at` juntos.
   * @param {string} id
   * @param {boolean} correct
   * @returns {Promise<import('../types/models.js').ServiceResult<Flashcard>>}
   */
  async review(id, correct) {
    const fallback = t('errors.flashcards.review')
    try {
      const current = await getSupabase().from('flashcards').select('id, box').eq('id', id).maybeSingle()
      if (current.error) return { data: null, error: translateError(current.error, fallback) }
      if (!current.data) return { data: null, error: fallback }
      const result = nextReview(current.data, correct)
      const { data, error } = await getSupabase()
        .from('flashcards')
        .update(result)
        .eq('id', id)
        .select('*')
        .single()
      if (error) return { data: null, error: translateError(error, fallback) }
      return { data, error: null }
    } catch (error) {
      return { data: null, error: translateError(error, fallback) }
    }
  },
}
