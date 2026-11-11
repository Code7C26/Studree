import { getLandingCopy } from './landingCopy.js'
import { useI18n } from '../../hooks/useI18n.js'
import { Brote } from './Brote.jsx'

/** Ramas del árbol (tronco + tres ramas + ramitas). Se dibujan de abajo hacia arriba al cargar. */
const BRANCHES = [
  'M180 300V210',
  'M180 210C120 190 90 160 80 110',
  'M180 210C180 170 180 140 180 90',
  'M180 210C240 190 270 160 285 105',
  'M80 110C70 85 55 75 40 70',
  'M80 110C95 85 105 75 118 66',
  'M285 105C300 85 315 80 330 76',
  'M285 105C270 80 262 72 250 66',
]

/** Nodos-píldora: materia, posición de la píldora y del texto. */
const NODES = [
  { x: 52, y: 88, tx: 80, ty: 105 },
  { x: 152, y: 68, tx: 180, ty: 85 },
  { x: 259, y: 84, tx: 287, ty: 101 },
]

const LEAVES = [
  [40, 70],
  [118, 66],
  [330, 76],
  [250, 66],
  [180, 50],
]

/**
 * Árbol de materias del hero: el elemento memorable de la landing. Una sola animación de entrada
 * (las ramas se dibujan), solo si el sistema no pidió reducir el movimiento.
 * @param {{ className?: string }} props
 */
export function HeroTree({ className = '' }) {
  const { lang } = useI18n()
  const { hero: HERO } = getLandingCopy(lang)
  return (
    <div className={className}>
      <svg viewBox="0 0 360 330" role="img" aria-label={HERO.treeLabel} className="h-auto w-full">
        <style>{`
          @media (prefers-reduced-motion: no-preference) {
            .lt-branch { stroke-dasharray: 1; stroke-dashoffset: 1; animation: lt-draw 1.6s ease-out forwards; }
            .lt-node, .lt-leaf { opacity: 0; animation: lt-show 0.5s ease-out 1.2s forwards; }
            @keyframes lt-draw { to { stroke-dashoffset: 0; } }
            @keyframes lt-show { to { opacity: 1; } }
          }
        `}</style>
        <g className="stroke-border" strokeWidth="2" fill="none" strokeLinecap="round">
          {BRANCHES.map((d) => (
            <path key={d} d={d} pathLength="1" className="lt-branch" />
          ))}
        </g>
        {NODES.map((node, i) => (
          <g key={HERO.subjects[i]} className="lt-node">
            <rect x={node.x} y={node.y} width="56" height="26" rx="13" className="fill-surface-lit stroke-accent" strokeWidth="1.6" />
            <text x={node.tx} y={node.ty} textAnchor="middle" fontSize="11" className="fill-accent-soft font-sans">
              {HERO.subjects[i]}
            </text>
          </g>
        ))}
        {LEAVES.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" className="lt-leaf fill-accent" />
        ))}
        <Brote x={140} y={236} size={80} />
      </svg>
    </div>
  )
}
