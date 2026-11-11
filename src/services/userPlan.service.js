/**
 * Plan del usuario (`user_plans`, migración 0007). Sin fila = 'free'.
 * El cambio de plan del checkout simulado va por la RPC `simulate_plan_change` (0013, Fase 17):
 * la tabla no tiene política de escritura. Ver docs/API_DOCS.md, docs/DB_SCHEMA.md y
 * docs/features/plans.md.
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

/**
 * Cambia el plan del usuario actual (checkout simulado de la Fase 17). La función solo
 * escribe la fila de quien llama y rechaza a los invitados.
 * @param {'free'|'premium'} plan
 * @returns {Promise<import('../types/models.js').ServiceResult<'free'|'premium'>>}
 */
export async function changePlan(plan) {
  try {
    const { data, error } = await getSupabase().rpc('simulate_plan_change', { p_plan: plan })
    if (error) {
      if (/guest cannot change plan/i.test(error.message ?? '')) return { data: null, error: t('errors.plan.guest') }
      return { data: null, error: translateError(error, t('errors.plan.change')) }
    }
    return { data: data === 'premium' ? 'premium' : 'free', error: null }
  } catch (error) {
    return { data: null, error: translateError(error, t('errors.plan.change')) }
  }
}
