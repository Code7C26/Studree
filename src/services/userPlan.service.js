/**
 * Plan del usuario (`user_plans`, migración 0007). Sin fila = 'free'.
 * Ver docs/API_DOCS.md y docs/DB_SCHEMA.md.
 */

import { getSupabase } from './supabase.client.js'
import { translateError } from './crudService.js'
import { t } from '../lib/i18n/index.js'

/**
 * @returns {Promise<import('../types/models.js').ServiceResult<'free'|'premium'>>}
 *   Ante un error devuelve `'free'` junto con el `error`.
 */
export async function getPlan() {
  try {
    const { data, error } = await getSupabase().from('user_plans').select('plan').maybeSingle()
    if (error) return { data: 'free', error: translateError(error, t('errors.plan.load')) }
    return { data: data?.plan === 'premium' ? 'premium' : 'free', error: null }
  } catch (error) {
    return { data: 'free', error: translateError(error, t('errors.plan.load')) }
  }
}
