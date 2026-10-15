import { HomePanel } from './HomePanel'
import { Button } from '../../ui/Button'
import { daysUntil, formatCountdown, formatShortDate } from '../../../lib/home/dates.js'

/**
 * La fecha importante más cercana, en grande, con cuenta regresiva.
 * @param {Object} props
 * @param {import('../../../types/models.js').ImportantDate|null} props.date
 * @param {string} props.todayKey
 * @param {boolean} props.loading
 * @param {() => void} props.onAdd
 * @param {string} [props.className]
 */
export function NextDateCard({ date, todayKey, loading, onAdd, className = '' }) {
  return (
    <HomePanel title="Próxima fecha" className={className}>
      {loading && !date ? (
        <p className="text-sm text-text-muted">Cargando…</p>
      ) : date ? (
        <div>
          <p className="break-words text-xl font-bold text-text">{date.title}</p>
          <p className="mt-1 text-sm">
            <span className="font-semibold text-accent">{formatCountdown(daysUntil(date.date, todayKey))}</span>
            <span className="text-text-muted"> · {formatShortDate(date.date)}</span>
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-text-muted">No tenés fechas próximas.</p>
          <Button variant="ghost" className="mt-3" onClick={onAdd}>
            ＋ Agregar fecha
          </Button>
        </div>
      )}
    </HomePanel>
  )
}
