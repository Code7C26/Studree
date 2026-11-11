import { Link } from 'react-router-dom'
import { START_PATH, getLandingCopy } from './landingCopy.js'
import { useI18n } from '../../hooks/useI18n.js'

/** Barra superior de la landing: marca, anclas a los bloques y CTA. */
export function LandingNav() {
  const { lang } = useI18n()
  const { hero: HERO, navLinks: NAV_LINKS, navLabel } = getLandingCopy(lang)
  return (
    <header className="relative z-10">
      <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-4 sm:px-6">
        <span className="mr-auto flex items-center gap-2.5">
          <img src="/logo.jpg" alt="" width="28" height="28" className="h-7 w-7 rounded-md" />
          <span className="font-display text-lg font-bold tracking-tight" translate="no">
            Studree
          </span>
        </span>
        <nav aria-label={navLabel} className="hidden items-center gap-6 text-sm text-text-muted md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-text">
              {link.label}
            </a>
          ))}
        </nav>
        <Link to={START_PATH} className="btn-accent rounded-full px-4 py-1.5 text-sm">
          {HERO.cta}
        </Link>
      </div>
    </header>
  )
}
