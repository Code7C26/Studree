/**
 * Nodo raíz del canvas de materia: la propia materia. Ver docs/features/subject-map.md.
 * Su "+" crea una unidad nueva colgando de ella (estilo n8n).
 */

import { Handle, Position } from '@xyflow/react'

/**
 * @param {Object} props
 * @param {Object} props.data
 * @param {import('../../../types/models.js').Subject} props.data.subject
 * @param {number} props.data.unitCount
 * @param {() => void} props.data.onAddChild
 */
export function SubjectRootNode({ data }) {
  const { subject, unitCount, onAddChild } = data

  return (
    <div className="group relative w-[190px] rounded-2xl border-2 border-accent bg-surface-2 px-4 py-3 text-center shadow-lg shadow-accent/10">
      <p className="line-clamp-2 text-base font-bold leading-snug" title={subject.name}>
        {subject.name}
      </p>
      <p className="mt-1 text-xs text-text-muted">
        {unitCount === 0 ? 'Sin unidades' : `${unitCount} unidad${unitCount === 1 ? '' : 'es'}`}
      </p>

      <Handle type="source" position={Position.Bottom} isConnectable={false} className="!h-2 !w-2 !border-none !bg-accent" />

      <button
        type="button"
        onClick={onAddChild}
        title="Nueva unidad"
        aria-label="Nueva unidad"
        className="nodrag absolute -bottom-10 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-accent bg-surface text-accent shadow transition-colors hover:bg-accent hover:text-bg"
      >
        +
      </button>
    </div>
  )
}
