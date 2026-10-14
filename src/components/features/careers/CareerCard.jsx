/**
 * Tarjeta de una carrera en el panel de inicio. Ver docs/features/careers.md.
 * El color es un valor por dato (paleta), por eso va por `style` inline.
 */

import { Link } from 'react-router-dom'
import { careerPath } from '../../../constants/routes'

/**
 * @param {Object} props
 * @param {import('../../../types/models.js').Career} props.career
 * @param {{approved: number, total: number, percent: number}} props.stats
 * @param {() => void} props.onEdit
 * @param {() => void} props.onDelete
 */
export function CareerCard({ career, stats, onEdit, onDelete }) {
  const usesPrerequisites = career.uses_prerequisites !== false
  const initial = career.name.trim().charAt(0).toUpperCase()

  return (
    <li className="group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lg">
      <div className="h-1.5" style={{ backgroundColor: career.color }} aria-hidden="true" />

      <Link to={careerPath(career.id)} className="block p-5">
        <div className="flex items-center gap-4 pr-16">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-bold"
            style={{ backgroundColor: `${career.color}26`, color: career.color }}
            aria-hidden="true"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold" title={career.name}>
              {career.name}
            </h2>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-text-muted">
              {usesPrerequisites ? '🔗 Con correlativas' : '📚 Curso / organizador'}
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-end justify-between text-sm">
          <span className="text-text-muted">
            <span className="text-2xl font-bold text-text">{stats.total}</span>{' '}
            {stats.total === 1 ? 'materia' : 'materias'}
          </span>
          <span className="font-medium" style={{ color: career.color }}>
            {stats.percent}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${stats.percent}%`, backgroundColor: career.color }}
          />
        </div>
        <p className="mt-2 text-xs text-text-muted">
          {stats.total === 0 ? 'Entrá para agregar materias' : `${stats.approved} de ${stats.total} aprobadas`}
        </p>
      </Link>

      <div className="absolute right-3 top-4 flex gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${career.name}`}
          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar ${career.name}`}
          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-red-400"
        >
          ✕
        </button>
      </div>
    </li>
  )
}
