import { getLandingCopy } from './landingCopy.js'
import { useI18n } from '../../hooks/useI18n.js'

/** Tu conocimiento es tuyo: el export a Markdown es el puente hacia cualquier IA. */
export function OwnershipSection() {
  const { lang } = useI18n()
  const { ownership: OWNERSHIP } = getLandingCopy(lang)
  return (
    <section aria-labelledby="tuyo-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 id="tuyo-title" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {OWNERSHIP.title}
          </h2>
          <p className="mt-4 max-w-[52ch] leading-relaxed text-text-muted">{OWNERSHIP.text}</p>
          <ul className="mt-6 space-y-3 text-sm leading-relaxed">
            {OWNERSHIP.points.map((point) => (
              <li key={point} className="border-l-2 border-accent pl-3">
                {point}
              </li>
            ))}
          </ul>
        </div>

        <figure className="overflow-hidden rounded-2xl border border-border bg-surface">
          <figcaption className="border-b border-border px-4 py-2 font-mono text-xs text-text-muted">
            {OWNERSHIP.fileName}
          </figcaption>
          <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-text">
            {OWNERSHIP.sample.join('\n')}
          </pre>
        </figure>
      </div>
    </section>
  )
}
