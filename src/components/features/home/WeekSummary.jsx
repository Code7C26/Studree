import { describeWeekSummary } from '../../../lib/home/summary.js'

/**
 * Línea de resumen: "Esta semana: 2 fechas · 3 tareas · 1 vencida".
 * @param {Object} props
 * @param {{dates: number, tasks: number, overdue: number}} props.summary
 * @param {boolean} props.loading
 * @param {boolean} props.failed - No cargaron las fechas o las tareas: no se
 *   afirma "semana tranquila" (sería falso).
 */
export function WeekSummary({ summary, loading, failed }) {
  const { calm, parts } = describeWeekSummary(summary)

  return (
    <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text" aria-live="polite">
      {loading ? (
        <span className="text-text-muted">Cargando la semana…</span>
      ) : failed ? (
        <span className="text-text-muted">No se pudo cargar el resumen de la semana.</span>
      ) : calm ? (
        'Semana tranquila: no tenés fechas ni tareas.'
      ) : (
        <>
          <span className="text-text-muted">Esta semana: </span>
          {parts.map((part, index) => (
            <span key={part.text} className={part.danger ? 'font-medium text-red-300' : ''}>
              {index > 0 && <span className="text-text-muted"> · </span>}
              {part.text}
            </span>
          ))}
        </>
      )}
    </p>
  )
}
