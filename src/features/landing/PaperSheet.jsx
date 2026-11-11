import { PAPER_HEADING } from './paperTones.js'

/**
 * Hoja de papel crema con renglones, como las hojas de la carpeta de la app (ADR-018).
 * El margen usa el acento; la fecha va arriba en tinta apagada.
 *
 * @param {{ date: string, children: React.ReactNode, className?: string }} props
 */
export function PaperSheet({ date, children, className = '' }) {
  return (
    <div
      className={`relative rounded-md bg-paper bg-[repeating-linear-gradient(transparent_0_23px,theme(colors.paper.line)_23px_24px)] py-4 pl-10 pr-5 text-sm leading-6 text-ink shadow-[0_18px_50px_rgba(0,0,0,0.55)] ring-1 ring-paper-border before:absolute before:inset-y-0 before:left-7 before:w-px before:bg-accent/40 ${className}`}
    >
      <p className="text-xs text-ink-muted">{date}</p>
      <div>{children}</div>
    </div>
  )
}

/**
 * Título (`# Tema`) dentro de una hoja: verde con contraste suficiente sobre el papel.
 * @param {{ children: React.ReactNode }} props
 */
export function PaperHeading({ children }) {
  return (
    <p className="font-display font-bold" style={{ color: PAPER_HEADING }}>
      {children}
    </p>
  )
}
