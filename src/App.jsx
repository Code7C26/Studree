import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAuth } from './components/layout/RequireAuth'
import { WorkspaceLayout } from './components/layout/WorkspaceLayout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { CareersPage } from './pages/CareersPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ROUTES } from './constants/routes'

// Páginas pesadas en chunks aparte: React Flow + dagre (canvas) y TipTap
// (editor) solo se descargan al entrar a esas vistas, no en el bundle inicial.
/** @param {() => Promise<Record<string, React.ComponentType>>} loader @param {string} name */
const lazyPage = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })))
const CareerMapPage = lazyPage(() => import('./pages/CareerMapPage'), 'CareerMapPage')
const SubjectMapPage = lazyPage(() => import('./pages/SubjectMapPage'), 'SubjectMapPage')
const SheetPage = lazyPage(() => import('./pages/SheetPage'), 'SheetPage')
const ProfilePage = lazyPage(() => import('./pages/ProfilePage'), 'ProfilePage')

/**
 * Suspense por ruta (no global): mientras baja el chunk, el header y el
 * explorador siguen visibles; solo el área de la página muestra "Cargando…".
 * @param {React.ReactNode} element
 */
const withSuspense = (element) => (
  <Suspense fallback={<p className="mt-8 text-center text-text-muted">Cargando…</p>}>{element}</Suspense>
)

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.login} element={<LoginPage />} />

        {/* Todo lo que toca datos del usuario exige sesión (RLS). */}
        <Route element={<RequireAuth />}>
          <Route path={ROUTES.profile} element={withSuspense(<ProfilePage />)} />

          {/* A partir de acá, el shell (explorador + tabs + palette) — ver navigation-shell.md. */}
          <Route element={<WorkspaceLayout />}>
            <Route path={ROUTES.careers} element={<CareersPage />} />
            <Route path={ROUTES.careerMap} element={withSuspense(<CareerMapPage />)} />
            <Route path={ROUTES.subjectMap} element={withSuspense(<SubjectMapPage />)} />
            <Route path={ROUTES.sheet} element={withSuspense(<SheetPage />)} />
          </Route>
        </Route>

        {/* Catch-all: evita la pantalla en blanco de una ruta sin registrar. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
