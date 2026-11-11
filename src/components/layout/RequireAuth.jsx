import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { ROUTES } from '../../constants/routes'
import { useI18n } from '../../hooks/useI18n.js'

/**
 * Guard de rutas: sin sesión no se entra al workspace.
 *
 * No es solo cosmético. Las políticas RLS son `to authenticated`, así que sin
 * sesión las pantallas se verían vacías y cualquier alta fallaría con un error
 * de la base. Mejor mandar al login que mostrar una app rota.
 */
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const { t } = useI18n()

  if (loading) {
    return <p className="py-16 text-center text-text-muted">{t('common.loading')}</p>
  }

  if (!user) {
    // Se recuerda a dónde iba para volver ahí después de entrar.
    return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}
