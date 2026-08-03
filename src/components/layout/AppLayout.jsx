import { Outlet } from 'react-router-dom'
import { Header } from './Header'

/** Layout principal: header de navegación + área de contenido (Outlet). */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
