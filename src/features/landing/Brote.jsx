/**
 * El Brote: brote verde redondo con dos hojas. Decorativo (el texto que lo acompaña ya dice quién habla).
 * Dentro de otro `<svg>` acepta `x` e `y` para ubicarse.
 * @param {{ size?: number, className?: string, x?: number, y?: number }} props
 */
export function Brote({ size = 48, className = '', x, y }) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <circle cx="24" cy="29" r="13" className="fill-accent" />
      <circle cx="19.5" cy="27" r="2" className="fill-bg" />
      <circle cx="28.5" cy="27" r="2" className="fill-bg" />
      <path d="M20 33c2.5 2 5.5 2 8 0" className="stroke-bg" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M24 16c-1-6-6-9-11-8 0 6 4 10 11 8z" className="fill-accent-soft" />
      <path d="M24 16c1-5 5-8 10-7 0 5-3 9-10 7z" className="fill-accent-hover" />
    </svg>
  )
}
