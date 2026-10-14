/**
 * Nodo del canvas de materia: una unidad. Ver docs/features/subject-map.md.
 * Su "+" crea un tema nuevo colgando de ella (estilo n8n).
 */

import { Handle, Position } from '@xyflow/react'

/**
 * @param {Object} props
 * @param {Object} props.data
 * @param {import('../../../types/models.js').Unit} props.data.unit
 * @param {number} props.data.topicCount
 * @param {() => void} props.data.onAddChild
 * @param {() => void} props.data.onDelete
 * @param {boolean} [props.selected]
 */
export function UnitNode({ data, selected }) {
  const { unit, topicCount, onAddChild, onDelete } = data

  return (
    <div
      className={`group relative w-[190px] rounded-xl border border-accent/50 bg-surface p-3 shadow-md transition-shadow hover:shadow-xl ${
        selected ? 'ring-2 ring-accent/60' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} className="!h-2 !w-2 !border-none !bg-accent/60" />
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="!h-2 !w-2 !border-none !bg-accent/60" />

      <div className="flex items-start justify-between gap-1">
        <span className="min-w-0 flex-1 text-sm font-semibold leading-snug" title={unit.name}>
          <span className="line-clamp-2">📁 {unit.name}</span>
        </span>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar ${unit.name}`}
          className="nodrag shrink-0 p-0.5 text-text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100 focus:opacity-100"
        >
          ✕
        </button>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        {topicCount === 0 ? 'Sin temas' : `${topicCount} tema${topicCount === 1 ? '' : 's'}`}
      </p>

      <button
        type="button"
        onClick={onAddChild}
        title="Nuevo tema"
        aria-label={`Nuevo tema en ${unit.name}`}
        className="nodrag absolute -bottom-10 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface-2 text-text-muted opacity-0 shadow transition-all hover:border-accent hover:text-accent group-hover:opacity-100 focus:opacity-100"
      >
        +
      </button>
    </div>
  )
}
