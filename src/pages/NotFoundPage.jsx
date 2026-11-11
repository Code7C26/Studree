import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ROUTES } from '../constants/routes'
import { useI18n } from '../hooks/useI18n.js'

/**
 * Catch-all de rutas.
 *
 * Sin esto, una ruta sin `<Route>` registrado (o un link a una página todavía
 * no implementada) renderiza `<Routes>` vacío: una pantalla en blanco sin
 * ningún error en consola. Pasó con `/carreras/:careerId` antes de tener esta
 * página — ver CHANGELOG.
 */
export function NotFoundPage() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h1 className="text-2xl font-bold">{t('shell.notFound.title')}</h1>
      <p className="mt-2 text-text-muted">{t('shell.notFound.message')}</p>
      <Link to={ROUTES.home} className="mt-6">
        <Button>{t('shell.notFound.back')}</Button>
      </Link>
    </div>
  )
}
