import { useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth.js'
import { useExplorerTree } from './useExplorerTree.js'
import { getPlan } from '../services/userPlan.service.js'
import { profileStats } from '../lib/profile/profileStats.js'

/**
 * Datos del Perfil: la sesión, el contenido cargado (del árbol del explorador, sin consultas
 * nuevas) y el plan. Ver docs/features/profile.md.
 * @returns {ReturnType<typeof useAuth> & {
 *   stats: ReturnType<typeof profileStats>,
 *   loadingStats: boolean,
 *   plan: 'free'|'premium'|null,
 * }}
 */
export function useProfile() {
  const auth = useAuth()
  const { careers, loading } = useExplorerTree()
  const [plan, setPlan] = useState(/** @type {'free'|'premium'|null} */ (null))
  const userId = auth.user?.id

  useEffect(() => {
    let alive = true
    getPlan().then(({ data }) => {
      if (alive) setPlan(data)
    })
    return () => {
      alive = false
    }
  }, [userId])

  const stats = useMemo(() => profileStats(careers), [careers])

  return { ...auth, stats, loadingStats: loading, plan }
}
