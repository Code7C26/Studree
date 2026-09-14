/**
 * Nodo del canvas de materia: una unidad. Ver docs/features/subject-map.md.
 */

import { Handle, Position } from '@xyflow/react'

/**
 * @param {Object} props
 * @param {Object} props.data
 * @param {import('../../../types/models.js').Unit} props.data.unit
 * @param {number} props.data.topicCount
 * @param {() => void} props.data.onDelete
 */
export function UnitNode({ data }) {
  const { unit, topicCount, onDelete } = data

  return (
    <div className="w-[180px] rounded-xl border border-accent/50 bg-surface p-3 shadow-sm">
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="!border-none !bg-border" />

      <div className="flex items-start justify-between gap-1">
        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={unit.name}>
          📁 {unit.name}
        </span>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar ${unit.name}`}
          className="shrink-0 p-0.5 text-text-muted transition-colors hover:text-red-400"
        >
          ✕
        </button>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        {topicCount === 0 ? 'Sin temas' : `${topicCount} tema${topicCount === 1 ? '' : 's'}`}
      </p>
    </div>
  )
}
