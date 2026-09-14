import { NavLink } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { useAuth } from '../../hooks/useAuth.js'

const NAV_ITEMS = [
  { to: ROUTES.home, label: 'Inicio' },
  { to: ROUTES.careers, label: 'Carreras' },
  { to: ROUTES.profile, label: 'Perfil' },
]

/** Cabecera con el logo, la navegación principal y el acceso a la sesión. */
export function Header() {
  const { user, isAnonymous, signOut } = useAuth()

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-3 sm:px-4">
        <span className="flex items-center gap-2 text-base font-bold sm:text-lg">
          <img
            src="/logo.jpg"
            alt=""
            width="32"
            height="32"
            className="h-7 w-7 rounded-lg sm:h-8 sm:w-8"
          />
          <span className="text-accent">Studree</span>
        </span>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === ROUTES.home}
              className={({ isActive }) =>
                `rounded-lg px-2 py-1.5 text-xs transition-colors sm:px-3 sm:text-sm ${
                  isActive
                    ? 'bg-accent text-bg'
                    : 'text-text-muted hover:bg-surface-2 hover:text-text'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}

          {/*
            Con sesión anónima NO se ofrece "Salir": no hay credencial con la que
            volver a entrar, así que cerrarla perdería los datos para siempre.
          */}
          {user && !isAnonymous ? (
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-2 hover:text-text sm:px-3 sm:text-sm"
            >
              Salir
            </button>
          ) : user && isAnonymous ? null : (
            <NavLink
              to={ROUTES.login}
              className="rounded-lg px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-2 hover:text-text sm:px-3 sm:text-sm"
            >
              Entrar
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  )
}
