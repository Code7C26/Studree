import { Link } from 'react-router-dom'
import { START_PATH, getLandingCopy } from './landingCopy.js'
import { useI18n } from '../../hooks/useI18n.js'
import { Brote } from './Brote.jsx'

/** Cierre: un último CTA. */
export function ClosingSection() {
  const { lang } = useI18n()
  const { closing: CLOSING, hero: HERO } = getLandingCopy(lang)
  return (
    <section aria-labelledby="cierre-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="flex flex-col items-start gap-6 rounded-3xl border border-accent/40 bg-surface-lit p-8 sm:p-12">
        <Brote size={56} />
        <h2 id="cierre-title" className="max-w-[20ch] font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          {CLOSING.title}
        </h2>
        <p className="max-w-[44ch] text-text-muted">{CLOSING.text}</p>
        <Link to={START_PATH} className="btn-accent rounded-full px-6 py-3 text-sm">
          {HERO.cta}
        </Link>
      </div>
    </section>
  )
}
