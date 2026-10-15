import { describeWeekSummary } from '../../../lib/home/summary.js'

/**
 * Bloque "Esta semana": tareas que vencen en los próximos 7 días en grande,
 * y debajo fechas y vencidas (ADR-018).
 * @param {Object} props
 * @param {{dates: number, tasks: number, overdue: number}} props.summary
 * @param {boolean} props.loading
 * @param {boolean} props.failed - No cargaron las fechas o las tareas: no se
 *   afirma "semana tranquila" (sería falso).
 * @param {string} [props.className]
 */
export function WeekSummary({ summary, loading, failed, className = '' }) {
  const { calm, parts } = describeWeekSummary(summary)

  return (
    <section className={`glass p-4 ${className}`} aria-label="Esta semana" aria-live="polite">
      <h2 className="flex min-h-8 items-center text-sm font-medium text-text-muted">Esta semana</h2>
      {loading ? (
        <p className="mt-1 text-sm text-text-muted">Cargando…</p>
      ) : failed ? (
        <p className="mt-1 text-sm text-text-muted">No se pudo cargar el resumen.</p>
      ) : calm ? (
        <p className="mt-1 text-sm text-text">Semana tranquila: no tenés fechas ni tareas.</p>
      ) : (
        <>
          <p className="font-display text-4xl font-extrabold tabular-nums">{summary.tasks}</p>
          <p className="text-sm text-text-muted">
            {summary.tasks === 1 ? 'tarea' : 'tareas'}, {parts[0].text}
            {summary.overdue > 0 && <span className="font-medium text-red-300">, {parts[2].text}</span>}
          </p>
        </>
      )}
    </section>
  )
}
