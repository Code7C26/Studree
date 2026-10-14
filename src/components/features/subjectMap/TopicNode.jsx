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
 * @param {boolean} [props.selected]
 */
export function TopicNode({ data, selected }) {
  const { topic, sheetCount, onOpen, onDelete } = data

  return (
    <div
      className={`group w-[190px] rounded-xl border border-border bg-surface p-3 shadow-md transition-colors hover:border-accent ${
        selected ? 'ring-2 ring-accent/60' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} className="!h-2 !w-2 !border-none !bg-border" />

      <div className="flex items-start justify-between gap-1">
        <button
          type="button"
          onClick={onOpen}
          className="nodrag min-w-0 flex-1 text-left text-sm font-medium leading-snug hover:text-accent"
          title={`Ver hojas de ${topic.name}`}
        >
          <span className="line-clamp-2">🔖 {topic.name}</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar ${topic.name}`}
          className="nodrag shrink-0 p-0.5 text-text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100 focus:opacity-100"
        >
          ✕
        </button>
      </div>
      <button type="button" onClick={onOpen} className="nodrag mt-1 text-xs text-text-muted hover:text-accent">
        {sheetCount === 0 ? '＋ Agregar hojas' : `📄 ${sheetCount} hoja${sheetCount === 1 ? '' : 's'}`}
      </button>
    </div>
  )
}
