/**
 * El Brote: brote verde redondo con dos hojas, ojos, sonrisa y cachetes.
 * SVG propio (ADR-018: nada de emojis). La animación de cada estado vive en
 * `index.css` (clases `.brote--*`) y se apaga con `prefers-reduced-motion`.
 * Siempre decorativo: el botón que lo contiene lleva el nombre accesible.
 */

/** @typedef {'idle'|'thinking'|'writing'|'happy'|'sad'|'sleeping'} BroteState */

/** Boca de cada estado (viewBox 64×64). */
const MOUTHS = {
  happy: 'M25 41q7 7 14 0',
  sad: 'M26 44q6-4 12 0',
  sleeping: 'M29 42h6',
  writing: 'M28 41q4 3 8 0',
}
const SMILE = 'M26 41q6 5 12 0'

/**
 * @param {Object} props
 * @param {BroteState} [props.state='idle']
 * @param {number} [props.size=56]
 * @param {string} [props.className]
 */
export function Brote({ state = 'idle', size = 56, className = '' }) {
  const closedEyes = state === 'sleeping' || state === 'happy'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={`brote brote--${state} shrink-0 ${className}`}
    >
      <g className="brote-body">
        <g className="brote-leaves">
          <path d="M32 24V15" className="fill-none stroke-accent-hover" strokeWidth="3" strokeLinecap="round" />
          <path d="M32 16C26 6 15 7 12 12c5 6 14 7 20 4Z" className="brote-leaf-left fill-accent-soft" />
          <path d="M32 15c4-9 14-11 19-7-3 7-12 10-19 7Z" className="brote-leaf-right fill-accent" />
        </g>
        <circle cx="32" cy="40" r="19" className="fill-accent" />
        <ellipse cx="26" cy="31" rx="7" ry="4" className="fill-accent-soft opacity-60" />
        {closedEyes ? (
          <g className="fill-none stroke-bg" strokeWidth="2.2" strokeLinecap="round">
            <path d={state === 'happy' ? 'M22 36q3-3 6 0' : 'M22 36h6'} />
            <path d={state === 'happy' ? 'M36 36q3-3 6 0' : 'M36 36h6'} />
          </g>
        ) : (
          <g className="brote-eyes fill-bg">
            <ellipse cx="25" cy="36" rx="2.6" ry="3.2" />
            <ellipse cx="39" cy="36" rx="2.6" ry="3.2" />
            <circle cx="26" cy="35" r="0.9" className="fill-text" />
            <circle cx="40" cy="35" r="0.9" className="fill-text" />
          </g>
        )}
        <circle cx="19.5" cy="42" r="3" className="fill-red-300/50" />
        <circle cx="44.5" cy="42" r="3" className="fill-red-300/50" />
        <path d={MOUTHS[state] ?? SMILE} className="fill-none stroke-bg" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </svg>
  )
}
