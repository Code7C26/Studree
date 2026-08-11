import { Link } from 'react-router-dom'
import { subjectMapPath } from '../../../constants/routes'

/**
 * Tarjeta de una materia, con barra de progreso. Lleva a su mapa conceptual.
 * @param {Object} props
 * @param {import('../../../types/models.js').Subject} props.subject
 * @param {number} props.progress - Porcentaje 0-100.
 * @param {() => void} props.onEdit
 * @param {() => void} props.onDelete
 */
export function SubjectCard({ subject, progress, onEdit, onDelete }) {
  return (
    <div className="card group relative transition-colors hover:border-accent/50">
      <Link to={subjectMapPath(subject.id)} className="block">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold"
            style={{ backgroundColor: `${subject.color}22`, color: subject.color }}
          >
            {subject.name.charAt(0).toUpperCase()}
          </span>
          <h3 className="min-w-0 truncate font-semibold">{subject.name}</h3>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-text-muted">
            <span>Progreso</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: subject.color }}
            />
          </div>
        </div>
      </Link>
      <div className="absolute right-3 top-3 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="rounded p-1.5 text-text-muted hover:text-accent"
          aria-label="Editar materia"
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1.5 text-text-muted hover:text-red-400"
          aria-label="Eliminar materia"
        >
          🗑
        </button>
      </div>
    </div>
  )
}
