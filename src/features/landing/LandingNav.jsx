import { Link } from 'react-router-dom'
import { ROUTES } from '../../constants/routes.js'
import { NAV_LINKS, NAV_LOGIN } from './landingCopy.js'

/** Barra superior de la landing: marca, anclas a los bloques y acceso. */
export function LandingNav() {
  return (
    <header className="relative z-10">
      <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-4 sm:px-6">
        <span className="mr-auto flex items-center gap-2.5">
          <img src="/logo.jpg" alt="" width="28" height="28" className="h-7 w-7 rounded-md" />
          <span className="font-display text-lg font-bold tracking-tight" translate="no">
            Studree
          </span>
        </span>
        <nav aria-label="Secciones" className="hidden items-center gap-6 text-sm text-text-muted md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-text">
              {link.label}
            </a>
          ))}
        </nav>
        <Link
          to={ROUTES.login}
          className="rounded-full border border-border px-4 py-1.5 text-sm transition-colors hover:border-text-muted/60"
        >
          {NAV_LOGIN}
        </Link>
      </div>
    </header>
  )
}
