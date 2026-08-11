import { Link } from 'react-router-dom'
import { folderPath } from '../../../constants/routes'

/**
 * Tarjeta de una carpeta (carrera/curso). Lleva a sus materias.
 * @param {Object} props
 * @param {import('../../../types/models.js').Folder} props.folder
 * @param {number} props.subjectCount
 * @param {() => void} props.onEdit
 * @param {() => void} props.onDelete
 */
export function FolderCard({ folder, subjectCount, onEdit, onDelete }) {
  return (
    <div className="card group relative transition-colors hover:border-accent/50">
      <Link to={folderPath(folder.id)} className="block">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
            style={{ backgroundColor: `${folder.color}22`, color: folder.color }}
          >
            📚
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{folder.name}</h3>
            <p className="text-xs text-text-muted">
              {subjectCount} {subjectCount === 1 ? 'materia' : 'materias'}
            </p>
          </div>
        </div>
      </Link>
      <div className="absolute right-3 top-3 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="rounded p-1.5 text-text-muted hover:text-accent"
          aria-label="Editar carpeta"
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1.5 text-text-muted hover:text-red-400"
          aria-label="Eliminar carpeta"
        >
          🗑
        </button>
      </div>
    </div>
  )
}
