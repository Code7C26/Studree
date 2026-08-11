import { Handle, Position } from '@xyflow/react'

/**
 * Nodo custom del mapa: checkbox de completado + label + badge de recursos + acciones.
 * Los controles llevan la clase `nodrag` para que no inicien un arrastre del nodo.
 * @param {Object} props
 * @param {{
 *   label: string,
 *   completed: boolean,
 *   resourceCount: number,
 *   onToggle: () => void,
 *   onOpen: () => void,
 *   onAddChild: () => void,
 *   onDelete: () => void,
 * }} props.data
 */
export function TopicNode({ data }) {
  return (
    <div
      className={`group min-w-[170px] rounded-lg border px-3 py-2 text-sm shadow-md transition-colors ${
        data.completed ? 'border-accent bg-accent/15' : 'border-border bg-surface-2'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-accent" />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={data.completed}
          onChange={data.onToggle}
          className="nodrag h-4 w-4 accent-accent"
          aria-label={`Marcar "${data.label}" como completado`}
        />
        <span className={data.completed ? 'text-text-muted line-through' : 'text-text'}>
          {data.label}
        </span>
        {data.resourceCount > 0 && (
          <button
            onClick={data.onOpen}
            className="nodrag ml-auto rounded-full bg-bg px-1.5 text-xs text-text-muted hover:text-accent"
            title="Ver recursos"
          >
            📎 {data.resourceCount}
          </button>
        )}
      </div>

      <div className="mt-2 flex justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button
          onClick={data.onOpen}
          className="nodrag rounded p-1.5 text-xs text-text-muted hover:text-accent"
          title="Recursos del tema"
          aria-label="Recursos del tema"
        >
          📎
        </button>
        <button
          onClick={data.onAddChild}
          className="nodrag rounded p-1.5 text-xs text-text-muted hover:text-accent"
          title="Agregar subtema"
          aria-label="Agregar subtema"
        >
          ＋
        </button>
        <button
          onClick={data.onDelete}
          className="nodrag rounded p-1.5 text-xs text-text-muted hover:text-red-400"
          title="Eliminar tema"
          aria-label="Eliminar tema"
        >
          🗑
        </button>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-accent" />
    </div>
  )
}
