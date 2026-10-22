import { Link } from 'react-router-dom'
import { Icon } from '../../ui/Icon'
import { formatSheetDateLong } from '../../../lib/format/sheetDate.js'

/**
 * Fila de la lista de Mi estudio: título (link a su página), materia o
 * "Varias materias", fecha, detalle opcional (puntaje) y botón de borrar.
 * @param {Object} props
 * @param {string} props.to
 * @param {string} props.title
 * @param {string|null|undefined} props.subjectName
 * @param {string} props.createdAt  ISO.
 * @param {string} [props.detail]  Ej. "7 de 10".
 * @param {string} props.deleteLabel
 * @param {() => void} props.onDelete
 */
export function StudyItemRow({ to, title, subjectName, createdAt, detail, deleteLabel, onDelete }) {
  return (
    <li className="flex items-center gap-3 border-b border-border/60 py-3">
      <Link to={to} className="min-w-0 flex-1 hover:text-accent-soft">
        <p className="truncate font-medium">{title}</p>
        <p className="mt-0.5 truncate text-xs text-text-muted">
          {subjectName || 'Varias materias'} · {formatSheetDateLong(createdAt)}
          {detail ? ` · ${detail}` : ''}
        </p>
      </Link>
      <button
        type="button"
        onClick={onDelete}
        aria-label={deleteLabel}
        className="rounded-lg p-2 text-text-muted hover:bg-surface-2 hover:text-red-300"
      >
        <Icon name="trash" />
      </button>
    </li>
  )
}
