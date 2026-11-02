import { FOLDER } from './landingCopy.js'
import { PaperHeading, PaperSheet } from './PaperSheet.jsx'

/** Mapa de correlativas en miniatura: tres materias y dos conectores. Decorativo. */
function MiniMap() {
  return (
    <svg viewBox="0 0 300 70" aria-hidden="true" className="mt-4 h-auto w-full">
      <g className="stroke-border" strokeWidth="2" fill="none">
        <path d="M92 35H104M192 35H204" />
      </g>
      {FOLDER.map.nodes.map((name, i) => (
        <g key={name}>
          <rect x={4 + i * 100} y="20" width="88" height="30" rx="15" className="fill-surface-lit stroke-accent" strokeWidth="1.5" />
          <text x={48 + i * 100} y="39" textAnchor="middle" fontSize="11" className="fill-accent-soft font-sans">
            {name}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** Calendario en miniatura (decorativo): una grilla de días con uno marcado. */
function MiniCalendar() {
  return (
    <div aria-hidden="true" className="mt-4 grid grid-cols-7 gap-1.5">
      {Array.from({ length: 21 }, (_, i) => (
        <span key={i} className={`h-5 rounded-sm ${i === 9 ? 'bg-accent' : 'bg-surface-2'}`} />
      ))}
    </div>
  )
}

/** Tu carpeta: la base de la que lee la IA. Hojas con índice, correlativas e Inicio, tres piezas distintas. */
export function FolderSection() {
  const { sheets, map, home } = FOLDER
  return (
    <section aria-labelledby="carpeta-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <h2 id="carpeta-title" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {FOLDER.title}
      </h2>
      <p className="mt-4 max-w-[52ch] text-text-muted">{FOLDER.intro}</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-lg font-semibold">{sheets.title}</h3>
          <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-text-muted">{sheets.text}</p>
          <div className="mt-5 grid items-start gap-4 sm:grid-cols-[1fr_9rem]">
            <PaperSheet date={sheets.date}>
              <PaperHeading># {sheets.topics[0]}</PaperHeading>
              <p>La mitocondria produce ATP.</p>
              <PaperHeading># {sheets.topics[1]}</PaperHeading>
              <p>Sintetizan proteínas.</p>
            </PaperSheet>
            <ul aria-label="Índice de temas" className="space-y-1.5 border-l border-border pl-3 text-sm text-text-muted">
              {sheets.topics.map((topic, i) => (
                <li key={topic} className={i === 0 ? 'font-medium text-accent-soft' : ''}>
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="text-lg font-semibold">{map.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{map.text}</p>
            <MiniMap />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="text-lg font-semibold">{home.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{home.text}</p>
            <MiniCalendar />
          </div>
        </div>
      </div>
    </section>
  )
}
