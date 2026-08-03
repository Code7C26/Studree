import { RESOURCE_TYPES } from '../../../constants/resourceTypes'

/**
 * Una fila de recurso: ícono por tipo, título, enlace o nota y acciones.
 * @param {Object} props
 * @param {import('../../../types/models.js').Resource} props.resource
 * @param {() => void} props.onEdit
 * @param {() => void} props.onDelete
 */
export function ResourceItem({ resource, onEdit, onDelete }) {
  const meta = RESOURCE_TYPES[resource.type] ?? RESOURCE_TYPES.note

  return (
    <li className="group flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3">
      <span className="text-lg" aria-hidden="true">
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{resource.title}</p>
        {meta.isUrl ? (
          <a
            href={resource.content}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-xs text-accent hover:underline"
          >
            {resource.content}
          </a>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-text-muted">{resource.content}</p>
        )}
      </div>
      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="rounded px-1 text-text-muted hover:text-accent"
          aria-label="Editar recurso"
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          className="rounded px-1 text-text-muted hover:text-red-400"
          aria-label="Eliminar recurso"
        >
          🗑
        </button>
      </div>
    </li>
  )
}
