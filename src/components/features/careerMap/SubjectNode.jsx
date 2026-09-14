/**
 * Nodo del canvas de carrera: una materia. Ver docs/features/career-map.md.
 */

import { Handle, Position } from '@xyflow/react'
import { STATUS_STYLES } from '../../../constants/subjectStatus.js'
import { SUBJECT_STATUS_VALUES } from '../../../constants/subjectStatus.js'

/**
 * @param {Object} props
 * @param {Object} props.data
 * @param {import('../../../types/models.js').Subject} props.data.subject
 * @param {import('../../../types/models.js').EffectiveStatus} props.data.status
 * @param {string|null} props.data.blockReason
 * @param {() => void} props.data.onNavigate
 * @param {(status: import('../../../types/models.js').SubjectStatus) => void} props.data.onChangeStatus
 * @param {() => void} props.data.onEditPrerequisites
 * @param {() => void} props.data.onDelete
 */
export function SubjectNode({ data }) {
  const { subject, status, blockReason, onNavigate, onChangeStatus, onEditPrerequisites, onDelete } = data
  const style = STATUS_STYLES[status]

  return (
    <div className={`w-[200px] rounded-xl border bg-surface p-3 shadow-sm ${style.border}`}>
      <Handle type="target" position={Position.Left} isConnectable={false} className="!border-none !bg-border" />
      <Handle type="source" position={Position.Right} isConnectable={false} className="!border-none !bg-border" />

      <div className="flex items-start justify-between gap-1">
        <button
          type="button"
          onClick={onNavigate}
          className="min-w-0 flex-1 text-left text-sm font-medium hover:underline"
          title={subject.name}
        >
          <span className="block truncate">{subject.name}</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar ${subject.name}`}
          className="shrink-0 p-0.5 text-text-muted transition-colors hover:text-red-400"
        >
          ✕
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {status === 'bloqueada' && <span aria-hidden="true">🔒</span>}
        <select
          value={subject.status}
          onChange={(event) => onChangeStatus(event.target.value)}
          className={`min-w-0 flex-1 rounded border border-border bg-bg px-1 py-0.5 text-[11px] outline-none transition-colors focus:border-accent ${style.text}`}
        >
          {SUBJECT_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {STATUS_STYLES[value].label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onEditPrerequisites}
        className="mt-2 w-full rounded px-1.5 py-1 text-left text-[11px] text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        🔗 Correlativas
      </button>

      {blockReason && (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-text-muted" title={blockReason}>
          {blockReason}
        </p>
      )}
    </div>
  )
}
