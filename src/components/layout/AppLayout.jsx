import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { ReadingModeProvider } from './ReadingModeProvider'
import { useReadingMode } from '../../hooks/useReadingMode.js'
import { useAuth } from '../../hooks/useAuth.js'
import { AssistantHost } from '../features/assistant/AssistantHost'
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

/** El layout en sí; en modo lectura (carpeta) oculta el header y el Brote (sin desmontarlo). */
function AppShell() {
  const location = useLocation()
  const { reading } = useReadingMode()
  const { user } = useAuth()
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
      {/* El Brote (asistente, Fase 14): con sesión y fuera del login. En modo lectura
          se oculta sin desmontarse (la conversación y el pedido en curso siguen). */}
      {user && location.pathname !== ROUTES.login && <AssistantHost hidden={reading} />}
    </div>
  )
}
