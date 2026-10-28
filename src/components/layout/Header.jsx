import { NavLink, useLocation } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { useAuth } from '../../hooks/useAuth.js'
import { Icon } from '../ui/Icon'
import { OPEN_PALETTE_EVENT } from './WorkspaceLayout'
import { useI18n } from '../../hooks/useI18n.js'

const NAV_ITEMS = [
  { to: ROUTES.home, labelKey: 'shell.nav.home' },
  { to: ROUTES.careers, labelKey: 'shell.nav.careers' },
  { to: ROUTES.study, labelKey: 'shell.nav.study' },
  { to: ROUTES.profile, labelKey: 'shell.nav.profile' },
]

/** Rutas con command palette (las del workspace, ver AppLayout). */
const PALETTE_PREFIXES = ['/carreras', '/materias', '/hojas']

const LINK = 'shrink-0 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-sm transition-colors sm:px-3'
const LINK_IDLE = `${LINK} text-text-muted hover:bg-surface-2 hover:text-text`

/**
 * Cabecera: logo original, buscador (abre la command palette, Ctrl K) y la
 * navegación principal. Ver docs/features/navigation-shell.md.
 */
export function Header() {
  const { user, isAnonymous, signOut } = useAuth()
  const { t } = useI18n()
  const { pathname } = useLocation()
  const hasPalette = pathname === ROUTES.home || PALETTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  return (
    <header className="border-b border-border/60">
      <div className="flex items-center gap-2 px-3 sm:gap-3 py-2.5 sm:px-5">
        <span className="flex shrink-0 items-center gap-2.5">
          <img src="/logo.jpg" alt="" width="28" height="28" className="h-7 w-7 rounded-md" />
          <span className="hidden font-display sm:inline text-lg font-bold tracking-tight text-text" translate="no">
            Studree
          </span>
        </span>

        {hasPalette && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
            className="ml-auto hidden min-w-[16rem] items-center gap-2 rounded-lg border border-border bg-surface/70 px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-text-muted/60 hover:text-text sm:flex"
          >
            <Icon name="search" />
            <span>{t('shell.header.search')}</span>
            <kbd className="ml-auto rounded border border-border px-1 font-sans text-[11px]">Ctrl&nbsp;K</kbd>
          </button>
        )}

        {/* min-w-0 + overflow-x-auto: si no entra (≤ 375px), la navegación se desliza y la página no. */}
        <nav className={`flex min-w-0 items-center gap-0.5 overflow-x-auto ${hasPalette ? 'sm:ml-0 ml-auto' : 'ml-auto'}`}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === ROUTES.home}
              className={({ isActive }) => (isActive ? `${LINK} font-medium text-accent-soft` : LINK_IDLE)}
            >
              {t(item.labelKey)}
            </NavLink>
          ))}

          {/*
            Con sesión anónima NO se ofrece "Salir": no hay credencial con la que
            volver a entrar, así que cerrarla perdería los datos para siempre.
          */}
          {user && !isAnonymous ? (
            <button type="button" onClick={signOut} className={LINK_IDLE}>
              {t('shell.nav.signOut')}
            </button>
          ) : user && isAnonymous ? null : (
            <NavLink to={ROUTES.login} className={LINK_IDLE}>
              {t('shell.nav.signIn')}
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  )
}
