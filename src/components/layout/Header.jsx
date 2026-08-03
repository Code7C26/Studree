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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <span className="text-lg font-bold">
          🌳 <span className="text-accent">Studree</span>
        </span>
        <nav className="flex gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === ROUTES.home}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm transition-colors ${
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
