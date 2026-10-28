import { describeWeekSummary } from '../../../lib/home/summary.js'
import { useI18n } from '../../../hooks/useI18n.js'

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
  const { t, lang } = useI18n()
  const { calm, parts } = describeWeekSummary(summary, lang)

  return (
    <section className={`glass p-4 ${className}`} aria-label={t('home.week.title')} aria-live="polite">
      <h2 className="flex min-h-8 items-center text-sm font-medium text-text-muted">{t('home.week.title')}</h2>
      {loading ? (
        <p className="mt-1 text-sm text-text-muted">{t('common.loading')}</p>
      ) : failed ? (
        <p className="mt-1 text-sm text-text-muted">{t('home.week.failed')}</p>
      ) : calm ? (
        <p className="mt-1 text-sm text-text">{t('home.week.calm')}</p>
      ) : (
        <>
          <p className="font-display text-4xl font-extrabold tabular-nums">{summary.tasks}</p>
          <p className="text-sm text-text-muted">
            {t('home.week.taskWord', { count: summary.tasks })}, {parts[0].text}
            {summary.overdue > 0 && <span className="font-medium text-red-300">, {parts[2].text}</span>}
          </p>
        </>
      )}
    </section>
  )
}
