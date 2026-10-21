import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { shouldShowLanding } from './shouldShowLanding.js'

/**
 * Ruta-layout que envuelve toda la app. En "/" sin sesión muestra la landing
 * pública; en cualquier otro caso (con sesión, sesión cargando u otra ruta) deja
 * pasar al árbol de siempre sin tocarlo. Ver docs/features/landing.md.
 *
 * @param {{ page: React.ReactNode }} props `page`: la landing (cargada con `lazy` por quien
 *   monta la ruta, así este módulo no importa de `pages/`).
 */
export function LandingGate({ page }) {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()

  if (shouldShowLanding({ pathname, loading, user })) {
    return <Suspense fallback={<p className="py-16 text-center text-text-muted">Cargando…</p>}>{page}</Suspense>
  }

  return <Outlet />
}
