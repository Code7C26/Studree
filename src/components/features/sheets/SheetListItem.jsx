/**
 * Fila del panel de hojas: título, fecha, acciones. Ver docs/features/subject-map.md.
 */

/**
 * @param {Object} props
 * @param {import('../../../types/models.js').Sheet} props.sheet
 * @param {() => void} props.onOpen
 * @param {() => void} props.onDelete
 */
export function SheetListItem({ sheet, onOpen, onDelete }) {
  const date = sheet.updated_at ?? sheet.created_at
  const formatted = date ? new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : ''

  return (
    <li className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm">
        <span aria-hidden="true">📝</span>
        <span className="min-w-0 flex-1 truncate">{sheet.title}</span>
      </button>
      <span className="shrink-0 text-xs text-text-muted">{formatted}</span>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Eliminar ${sheet.title}`}
        className="shrink-0 p-1 text-text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
      >
        ✕
      </button>
    </li>
  )
}
