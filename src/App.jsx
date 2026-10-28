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
import { useI18n } from './hooks/useI18n.js'
import { t } from './lib/i18n/index.js'

// Páginas pesadas en chunks aparte: React Flow + dagre (canvas) y TipTap
// (editor) solo se descargan al entrar a esas vistas, no en el bundle inicial.
/** @param {() => Promise<Record<string, React.ComponentType>>} loader @param {string} name */
const lazyPage = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })))
const CareerMapPage = lazyPage(() => import('./pages/CareerMapPage'), 'CareerMapPage')
const SubjectFolderPage = lazyPage(() => import('./pages/SubjectFolderPage'), 'SubjectFolderPage')
const SheetRedirectPage = lazyPage(() => import('./pages/SheetRedirectPage'), 'SheetRedirectPage')
const TrashPage = lazyPage(() => import('./pages/TrashPage'), 'TrashPage')
const ProfilePage = lazyPage(() => import('./pages/ProfilePage'), 'ProfilePage')
const StudyPage = lazyPage(() => import('./pages/StudyPage'), 'StudyPage')
const StudySummaryPage = lazyPage(() => import('./pages/StudySummaryPage'), 'StudySummaryPage')
const StudyQuizPage = lazyPage(() => import('./pages/StudyQuizPage'), 'StudyQuizPage')

/**
 * Suspense por ruta (no global): mientras baja el chunk, el header y el
 * explorador siguen visibles; solo el área de la página muestra "Cargando…".
 * @param {React.ReactNode} element
 */
const withSuspense = (element) => (
  <Suspense fallback={<p className="mt-8 text-center text-text-muted">{t('common.loading')}</p>}>{element}</Suspense>
)

export default function App() {
  // Suscribe la raíz al idioma: al cambiarlo, todo el árbol de rutas vuelve a pintar.
  useI18n()
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Única ruta pública (más el catch-all). */}
        <Route path={ROUTES.login} element={<LoginPage />} />

        {/* Todo lo que toca datos del usuario exige sesión (RLS). */}
        <Route element={<RequireAuth />}>
          <Route path={ROUTES.profile} element={withSuspense(<ProfilePage />)} />

          {/* A partir de acá, el shell (explorador + tabs + palette) — ver navigation-shell.md. */}
          <Route element={<WorkspaceLayout />}>
            {/* Inicio: "/" con sesión (ver docs/features/home.md). */}
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.careers} element={<CareersPage />} />
            <Route path={ROUTES.careerMap} element={withSuspense(<CareerMapPage />)} />
            <Route path={ROUTES.subjectFolder} element={withSuspense(<SubjectFolderPage />)} />
            <Route path={ROUTES.sheet} element={withSuspense(<SheetRedirectPage />)} />
            <Route path={ROUTES.trash} element={withSuspense(<TrashPage />)} />
            <Route path={ROUTES.study} element={withSuspense(<StudyPage />)} />
            <Route path={ROUTES.studySummary} element={withSuspense(<StudySummaryPage />)} />
            <Route path={ROUTES.studyQuiz} element={withSuspense(<StudyQuizPage />)} />
          </Route>
        </Route>

        {/* Catch-all: evita la pantalla en blanco de una ruta sin registrar. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
