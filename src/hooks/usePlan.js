import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth.js'
import { changePlan, getPlan } from '../services/userPlan.service.js'
import { CHECKOUT_DELAY_MS } from '../constants/plans.js'

/** @param {number} ms */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Plan actual y checkout simulado (Fase 17). Ver docs/features/plans.md.
 * @returns {{
 *   plan: 'free'|'premium'|null,
 *   isAnonymous: boolean,
 *   upgrade: () => Promise<{error: string|null}>,
 *   downgrade: () => Promise<{error: string|null}>,
 * }}
 */
export function usePlan() {
  const { user, isAnonymous } = useAuth()
  const [plan, setPlan] = useState(/** @type {'free'|'premium'|null} */ (null))
  const userId = user?.id

  useEffect(() => {
    let alive = true
    getPlan().then(({ data }) => {
      if (alive) setPlan(data)
    })
    return () => {
      alive = false
    }
  }, [userId])

  /** @param {'free'|'premium'} next @param {number} minMs */
  const apply = useCallback(async (next, minMs) => {
    // "Procesando el pago…" dura al menos `minMs`, aunque la base responda antes.
    const [result] = await Promise.all([changePlan(next), wait(minMs)])
    if (!result.error) setPlan(result.data)
    return { error: result.error }
  }, [])

  const upgrade = useCallback(() => apply('premium', CHECKOUT_DELAY_MS), [apply])
  const downgrade = useCallback(() => apply('free', 0), [apply])

  return { plan, isAnonymous, upgrade, downgrade }
}
