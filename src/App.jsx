import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAuth } from './components/layout/RequireAuth'
import { WorkspaceLayout } from './components/layout/WorkspaceLayout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { CareersPage } from './pages/CareersPage'
import { CareerMapPage } from './pages/CareerMapPage'
import { SubjectMapPage } from './pages/SubjectMapPage'
import { SheetPage } from './pages/SheetPage'
import { ProfilePage } from './pages/ProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ROUTES } from './constants/routes'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.login} element={<LoginPage />} />

        {/* Todo lo que toca datos del usuario exige sesión (RLS). */}
        <Route element={<RequireAuth />}>
          <Route path={ROUTES.profile} element={<ProfilePage />} />

          {/* A partir de acá, el shell (explorador + tabs + palette) — ver navigation-shell.md. */}
          <Route element={<WorkspaceLayout />}>
            <Route path={ROUTES.careers} element={<CareersPage />} />
            <Route path={ROUTES.careerMap} element={<CareerMapPage />} />
            <Route path={ROUTES.subjectMap} element={<SubjectMapPage />} />
            <Route path={ROUTES.sheet} element={<SheetPage />} />
          </Route>
        </Route>

        {/* Catch-all: evita la pantalla en blanco de una ruta sin registrar. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
