/**
 * Nodo del canvas de materia: una HOJA (ADR-014). Ver docs/features/subject-map.md.
 *
 * Estilo n8n: se arrastra libremente; el punto derecho se une al izquierdo de
 * otra hoja para enlazarlas (`[[link]]`, ADR-015); el "+" crea una hoja nueva
 * ya enlazada desde esta. Los controles internos llevan `nodrag` para que hacer
 * click no arrastre el nodo.
 */

import { Handle, Position } from '@xyflow/react'

const HANDLE_CLASS = '!h-3 !w-3 !border-2 !border-accent !bg-bg transition-transform hover:!scale-125'

/** @param {string} iso */
function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : ''
}

/**
 * @param {Object} props
 * @param {Object} props.data
 * @param {import('../../../types/models.js').Sheet} props.data.sheet
 * @param {number} props.data.linkCount - Links salientes + entrantes.
 * @param {() => void} props.data.onOpen
 * @param {() => void} props.data.onDelete
 * @param {() => void} props.data.onAddLinked
 * @param {boolean} [props.selected]
 */
export function SheetNode({ data, selected }) {
  const { sheet, linkCount, onOpen, onDelete, onAddLinked } = data

  return (
    <div
      className={`group relative w-[200px] rounded-xl border border-border bg-surface p-3 shadow-md transition-colors hover:border-accent ${
        selected ? 'ring-2 ring-accent/60' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />

      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={onOpen}
          className="nodrag min-w-0 flex-1 text-left text-sm font-medium leading-snug hover:text-accent"
          title={`Abrir ${sheet.title}`}
        >
          <span className="line-clamp-2">📝 {sheet.title}</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar ${sheet.title}`}
          className="nodrag shrink-0 rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100 focus:opacity-100"
        >
          ✕
        </button>
      </div>

      <p className="mt-1.5 flex items-center justify-between text-[11px] text-text-muted">
        <span>{formatDate(sheet.updated_at ?? sheet.created_at)}</span>
        {linkCount > 0 && (
          <span title="Enlaces">
            🔗 {linkCount}
          </span>
        )}
      </p>

      {/* "+" estilo n8n: nueva hoja enlazada desde esta. */}
      <button
        type="button"
        onClick={onAddLinked}
        aria-label={`Nueva hoja enlazada desde ${sheet.title}`}
        title="Nueva hoja enlazada desde esta"
        className="nodrag absolute -right-11 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-2 text-text-muted opacity-0 shadow transition-all hover:border-accent hover:text-accent group-hover:opacity-100 focus:opacity-100"
      >
        +
      </button>
    </div>
  )
}
