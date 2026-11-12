import { Link } from 'react-router-dom'
import { START_PATH, getLandingCopy } from './landingCopy.js'
import { useI18n } from '../../hooks/useI18n.js'
import { rememberEntryChoice } from '../../hooks/useFirstVisit.js'
import { ROUTES } from '../../constants/routes.js'
import { HeroTree } from './HeroTree.jsx'

/** Hero: el titular de la idea central y el árbol de materias con el Brote. */
export function HeroSection() {
  const { lang } = useI18n()
  const { hero: HERO } = getLandingCopy(lang)
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-2 lg:pb-24 lg:pt-14">
        <div>
          <h1 id="hero-title" className="font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
            {HERO.title[0]}
            <br />
            {HERO.title[1]}
            <br />
            <span className="text-accent-soft">{HERO.title[2]}</span>
          </h1>
          <p className="mt-5 max-w-[44ch] text-base leading-relaxed text-text-muted">{HERO.subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to={START_PATH} className="btn-accent rounded-full px-6 py-3 text-sm">
              {HERO.cta}
            </Link>
            {/* Entra directo como invitado, sin el cartel de entrada. */}
            <Link
              to={ROUTES.home}
              onClick={() => rememberEntryChoice('guest')}
              className="rounded-full border border-accent/60 px-6 py-3 text-sm font-medium text-accent-soft transition-colors hover:bg-accent/10"
            >
              {HERO.guest}
            </Link>
            <a href="#como-funciona" className="px-3 py-3 text-sm text-text-muted transition-colors hover:text-text">
              {HERO.secondary}
            </a>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-lg">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,theme(colors.accent.DEFAULT/0.2),transparent)]"
          />
          <HeroTree />
        </div>
      </div>
    </section>
  )
}
