import { STEPS } from './landingCopy.js'

/** Cómo funciona: tres pasos reales (esto sí es una secuencia, por eso van numerados). */
export function HowItWorksSection() {
  return (
    <section id="como-funciona" aria-labelledby="como-title" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6 lg:py-24">
      <h2 id="como-title" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {STEPS.title}
      </h2>
      <ol className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-8">
        {STEPS.items.map((step, index) => (
          <li key={step.title} className="border-t border-border pt-5">
            <span className="font-display text-5xl font-extrabold text-accent-soft" aria-hidden="true">
              {index + 1}
            </span>
            <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 max-w-[40ch] leading-relaxed text-text-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
