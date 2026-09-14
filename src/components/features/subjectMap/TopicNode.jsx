/**
 * Nodo del canvas de materia: un tema. Ver docs/features/subject-map.md.
 * Click en el nodo abre el panel lateral de hojas (el canvas no baja a ese nivel).
 */

import { Handle, Position } from '@xyflow/react'

/**
 * @param {Object} props
 * @param {Object} props.data
 * @param {import('../../../types/models.js').Topic} props.data.topic
 * @param {number} props.data.sheetCount
 * @param {() => void} props.data.onOpen
 * @param {() => void} props.data.onDelete
 */
export function TopicNode({ data }) {
  const { topic, sheetCount, onOpen, onDelete } = data

  return (
    <div className="w-[180px] rounded-xl border border-border bg-surface p-3 shadow-sm transition-colors hover:border-accent">
      <Handle type="target" position={Position.Top} isConnectable={false} className="!border-none !bg-border" />

      <div className="flex items-start justify-between gap-1">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left text-sm font-medium hover:underline" title={topic.name}>
          🔖 {topic.name}
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar ${topic.name}`}
          className="shrink-0 p-0.5 text-text-muted transition-colors hover:text-red-400"
        >
          ✕
        </button>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        {sheetCount === 0 ? 'Sin hojas' : `${sheetCount} hoja${sheetCount === 1 ? '' : 's'}`}
      </p>
    </div>
  )
}
