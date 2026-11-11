import { getLandingCopy } from './landingCopy.js'
import { useI18n } from '../../hooks/useI18n.js'
import { Brote } from './Brote.jsx'
import { PaperHeading, PaperSheet } from './PaperSheet.jsx'

/** El Brote: qué hace con el conocimiento del usuario y cómo se mantiene el control. La demo es ilustrativa. */
export function BroteSection() {
  const { lang } = useI18n()
  const { brote: BROTE } = getLandingCopy(lang)
  const { demo } = BROTE
  return (
    <section id="brote" aria-labelledby="brote-title" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6 lg:py-24">
      <div className="flex items-center gap-3">
        <Brote size={44} />
        <h2 id="brote-title" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          {BROTE.title}
        </h2>
      </div>
      <p className="mt-4 max-w-[52ch] text-text-muted">{BROTE.intro}</p>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_1.1fr]">
        <ul className="divide-y divide-border border-y border-border">
          {BROTE.capabilities.map((item) => (
            <li key={item.title} className="py-4">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">{item.text}</p>
            </li>
          ))}
        </ul>

        <div>
          <figure aria-label={demo.label} className="rounded-2xl border border-accent/40 bg-surface-lit p-5">
            <PaperSheet date={demo.date}>
              <PaperHeading>{demo.heading}</PaperHeading>
              <p>{demo.kept}</p>
              <p className="rounded-sm bg-accent/20 px-1 ring-1 ring-accent/50">{demo.proposed}</p>
            </PaperSheet>
            <div aria-hidden="true" className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-accent px-4 py-1.5 text-bg">{demo.actions[0]}</span>
              <span className="rounded-full border border-border px-4 py-1.5 text-text-muted">{demo.actions[1]}</span>
              <span className="rounded-full border border-border px-4 py-1.5 text-text-muted">{demo.actions[2]}</span>
            </div>
            <figcaption className="mt-3 text-xs text-text-muted">{demo.label}</figcaption>
          </figure>
          <ul className="mt-6 space-y-3 text-sm leading-relaxed">
            {BROTE.guarantees.map((text) => (
              <li key={text} className="border-l-2 border-accent pl-3">
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
