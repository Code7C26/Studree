import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { ReadingModeProvider } from './ReadingModeProvider'
import { useReadingMode } from '../../hooks/useReadingMode.js'
import { ROUTES } from '../../constants/routes'

/** Rutas que viven dentro del shell (WorkspaceLayout: explorador + tabs + palette). */
const WORKSPACE_PREFIXES = ['/carreras', '/materias', '/hojas']

/**
 * Layout raíz: header de navegación + área de contenido.
 *
 * Las rutas del workspace (ver docs/features/navigation-shell.md) necesitan
 * ocupar el alto completo debajo del header, sin el `max-w-6xl` centrado ni el
 * padding que usan las páginas simples — por eso acá se decide, según la
 * ruta, si el `<Outlet/>` va suelto (lo maneja `WorkspaceLayout`) o envuelto.
 */
export function AppLayout() {
  return (
    <ReadingModeProvider>
      <AppShell />
    </ReadingModeProvider>
  )
}

/** El layout en sí; en modo lectura (carpeta) oculta el header. */
function AppShell() {
  const location = useLocation()
  const { reading } = useReadingMode()
  // "/" (exacta) es el Inicio, que también vive en el shell (docs/features/home.md).
  const isWorkspace =
    location.pathname === ROUTES.home || WORKSPACE_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))

  return (
    <div className="flex h-screen flex-col bg-bg text-text">
      {!reading && <Header />}
      {isWorkspace ? (
        <Outlet />
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-4 py-8">
          <Outlet />
        </main>
      )}
    </div>
  )
}
