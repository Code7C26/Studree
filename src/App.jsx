import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { HomePage } from './pages/HomePage'
import { FoldersPage } from './pages/FoldersPage'
import { FolderPage } from './pages/FolderPage'
import { SubjectMapPage } from './pages/SubjectMapPage'
import { ProfilePage } from './pages/ProfilePage'
import { ROUTES } from './constants/routes'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.folders} element={<FoldersPage />} />
        <Route path={ROUTES.folder} element={<FolderPage />} />
        <Route path={ROUTES.subjectMap} element={<SubjectMapPage />} />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}
