import { PROBLEM } from './landingCopy.js'
import { PaperSheet } from './PaperSheet.jsx'
import { Brote } from './Brote.jsx'

/** El problema: la misma pregunta a un chat genérico y al Brote con las hojas del usuario. Ejemplo ilustrativo. */
export function ProblemSection() {
  return (
    <section aria-labelledby="problema-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <h2 id="problema-title" className="max-w-[24ch] font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
        {PROBLEM.title}
      </h2>
      <p className="mt-6 rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3 text-sm sm:max-w-md">
        {PROBLEM.question}
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface/60 p-5">
          <h3 className="text-sm font-semibold text-text-muted">{PROBLEM.generic.label}</h3>
          <p className="mt-3 leading-relaxed text-text-muted">{PROBLEM.generic.answer}</p>
        </div>

        <div className="rounded-2xl border border-accent/40 bg-surface-lit p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-accent-soft">
            <Brote size={22} />
            {PROBLEM.brote.label}
          </h3>
          <PaperSheet date={PROBLEM.sheet.date} className="mt-4 max-w-sm -rotate-1">
            <p className="font-display font-bold text-accent-hover">{PROBLEM.sheet.title}</p>
            {PROBLEM.sheet.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </PaperSheet>
          <p className="mt-4 leading-relaxed">{PROBLEM.brote.answer}</p>
          <p className="mt-3 inline-block rounded-md border border-border px-2 py-1 text-xs text-text-muted">
            {PROBLEM.brote.source}
          </p>
        </div>
      </div>
    </section>
  )
}
