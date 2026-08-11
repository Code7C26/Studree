import { NavLink } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'

const NAV_ITEMS = [
  { to: ROUTES.home, label: 'Inicio' },
  { to: ROUTES.folders, label: 'Carpetas' },
  { to: ROUTES.profile, label: 'Perfil' },
]

/** Cabecera con el logo y la navegación principal. */
export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-3 sm:px-4">
        <span className="text-base font-bold sm:text-lg">
          🌳 <span className="text-accent">Studree</span>
        </span>
        <nav className="flex gap-0.5 sm:gap-1">
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
        </nav>
      </div>
    </header>
  )
}
