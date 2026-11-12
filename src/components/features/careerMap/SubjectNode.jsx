/**
 * Nodo del canvas de carrera: una materia. Ver docs/features/career-map.md.
 *
 * Estilo n8n: se arrastra libremente, tiene un punto de salida (derecha) para
 * conectar correlativas y un "+" para crear la siguiente materia ya conectada.
 * Se agarra desde cualquier lado, también desde el nombre (un click sin mover lo
 * abre). Solo los controles chicos (estado, borrar, correlativas, "+") llevan
 * `nodrag`: si el nombre lo llevaba, casi no quedaba de dónde agarrar la tarjeta.
 */

import { Handle, Position } from '@xyflow/react'
import { STATUS_STYLES, SUBJECT_STATUS_VALUES } from '../../../constants/subjectStatus.js'
import { useI18n } from '../../../hooks/useI18n.js'

/** Puntos de conexión: siempre se puede unir (correlativa o, sin correlativas, relación). */
const HANDLE_CLASS = '!h-3 !w-3 !border-2 !border-accent !bg-bg transition-transform hover:!scale-125'

/** Años que ofrece el selector (la base acepta 1..10). */
const YEARS = [1, 2, 3, 4, 5, 6, 7]

/**
 * @param {Object} props
 * @param {Object} props.data
 * @param {import('../../../types/models.js').Subject} props.data.subject
 * @param {import('../../../types/models.js').EffectiveStatus} props.data.status
 * @param {string|null} props.data.blockReason
 * @param {boolean} props.data.usesPrerequisites
 * @param {() => void} props.data.onNavigate
 * @param {(status: import('../../../types/models.js').SubjectStatus) => void} props.data.onChangeStatus
 * @param {(year: number|null) => void} props.data.onChangeYear
 * @param {() => void} props.data.onEditPrerequisites
 * @param {() => void} props.data.onDelete
 * @param {() => void} props.data.onAddNext
 * @param {boolean} [props.selected]
 */
export function SubjectNode({ data, selected }) {
  const { t } = useI18n()
  const { subject, status, blockReason, usesPrerequisites, onNavigate, onChangeStatus, onChangeYear, onEditPrerequisites, onDelete, onAddNext } =
    data
  const style = STATUS_STYLES[status]

  return (
    <div
      className={`group relative w-[220px] cursor-grab rounded-xl border-2 bg-surface p-3 shadow-md transition-shadow hover:shadow-xl active:cursor-grabbing ${style.border} ${
        selected ? 'ring-2 ring-accent/60' : ''
      }`}
      title={blockReason ?? undefined}
    >
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />

      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
          style={{ backgroundColor: `${subject.color}26`, color: subject.color }}
          aria-hidden="true"
        >
          {subject.name.trim().charAt(0).toUpperCase()}
        </span>
        <button
          type="button"
          onClick={onNavigate}
          className="min-w-0 flex-1 text-left text-sm font-semibold leading-snug hover:text-accent"
          title={t('careerMap.node.open', { name: subject.name })}
        >
          <span className="line-clamp-2">{subject.name}</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t('careerMap.node.delete', { name: subject.name })}
          className="nodrag shrink-0 rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100 focus:opacity-100"
        >
          ✕
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${style.chip}`}>
          <span aria-hidden="true">{style.icon}</span> {t(style.labelKey)}
        </span>
        <select
          value={subject.status}
          onChange={(event) => onChangeStatus(event.target.value)}
          aria-label={t('careerMap.node.changeStatus')}
          className="nodrag min-w-0 flex-1 rounded border border-border bg-bg px-1 py-0.5 text-[11px] text-text-muted outline-none transition-colors focus:border-accent"
        >
          {SUBJECT_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {t(STATUS_STYLES[value].labelKey)}
            </option>
          ))}
        </select>
        {usesPrerequisites && (
          <button
            type="button"
            onClick={onEditPrerequisites}
            className="nodrag shrink-0 rounded px-1.5 py-0.5 text-[11px] text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            title={t('careerMap.node.editPrereq')}
          >
            🔗
          </button>
        )}
      </div>

      <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-text-muted">
        {t('careerMap.node.year')}
        <select
          value={subject.year ?? ''}
          onChange={(event) => onChangeYear(event.target.value === '' ? null : Number(event.target.value))}
          aria-label={t('careerMap.node.changeYear')}
          className="nodrag rounded border border-border bg-bg px-1 py-0.5 text-[11px] text-text-muted outline-none transition-colors focus:border-accent"
        >
          <option value="">{t('careerMap.node.noYear')}</option>
          {YEARS.map((year) => (
            <option key={year} value={year}>
              {t('careerMap.map.yearHeader', { year })}
            </option>
          ))}
        </select>
      </label>

      {blockReason && <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-text-muted">{blockReason}</p>}

      {/* "+" estilo n8n: crea la siguiente materia (conectada, si hay correlativas). */}
      <button
        type="button"
        onClick={onAddNext}
        aria-label={t('careerMap.node.addAfter', { name: subject.name })}
        title={usesPrerequisites ? t('careerMap.node.newRequiring') : t('careerMap.node.newSubject')}
        className="nodrag absolute -right-11 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-2 text-text-muted opacity-0 shadow transition-all hover:border-accent hover:text-accent group-hover:opacity-100 focus:opacity-100"
      >
        +
      </button>
    </div>
  )
}
