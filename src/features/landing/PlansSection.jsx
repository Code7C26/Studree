import { PLANS } from './landingCopy.js'

/** Planes: diferencias cualitativas entre Gratis y Premium (sin precios ni topes numéricos). */
export function PlansSection() {
  return (
    <section id="planes" aria-labelledby="planes-title" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6 lg:py-24">
      <h2 id="planes-title" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {PLANS.title}
      </h2>
      <p className="mt-4 max-w-[52ch] text-text-muted">{PLANS.intro}</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-lg font-semibold">{PLANS.freeLabel}</h3>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-text-muted">
            {PLANS.free.map((item) => (
              <li key={item} className="border-l border-border pl-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-accent/50 bg-surface-lit p-6">
          <h3 className="text-lg font-semibold text-accent-soft">{PLANS.premiumLabel}</h3>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed">
            {PLANS.premium.map((item) => (
              <li key={item} className="border-l border-accent pl-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
