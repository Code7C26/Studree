import { FOOTER } from './landingCopy.js'

/** Pie de la landing: marca, una línea y el año. */
export function LandingFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="" width="22" height="22" className="h-[22px] w-[22px] rounded" loading="lazy" />
          <span className="font-display font-bold text-text" translate="no">
            Studree
          </span>
        </span>
        <p>{FOOTER.tagline}</p>
        <p>{new Date().getFullYear()}</p>
      </div>
    </footer>
  )
}
