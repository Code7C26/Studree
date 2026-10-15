import { HomePanel } from './HomePanel'
import { Button } from '../../ui/Button'
import { daysUntil, formatShortDate } from '../../../lib/home/dates.js'
import { Icon } from '../../ui/Icon'

/**
 * La fecha importante más cercana, en grande, con cuenta regresiva.
 * @param {Object} props
 * @param {import('../../../types/models.js').ImportantDate|null} props.date
 * @param {string} props.todayKey
 * @param {boolean} props.loading
 * @param {string|null} props.error - Si no se pudieron cargar las fechas, no se
 *   afirma "no tenés fechas" (sería falso) ni se ofrece agregar una.
 * @param {() => void} props.onAdd
 * @param {string} [props.className]
 */
export function NextDateCard({ date, todayKey, loading, error, onAdd, className = '' }) {
  const days = date ? daysUntil(date.date, todayKey) : null
  // Faltan 7 días o menos: borde ámbar (lo urgente).
  const soon = days !== null && days <= 7

  return (
    <HomePanel title="Próxima fecha" error={error} className={`${soon ? '!border-warn/40' : ''} ${className}`}>
      {loading && !date ? (
        <p className="text-sm text-text-muted">Cargando…</p>
      ) : error && !date ? null : date ? (
        <div>
          <p className="break-words text-sm text-text">{date.title}</p>
          <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-warn">
            {days === 0 ? 'Hoy' : days}
            {days > 0 && <span className="ml-1 font-sans text-sm font-medium">{days === 1 ? 'día' : 'días'}</span>}
          </p>
          <p className="text-xs text-text-muted">{formatShortDate(date.date)}</p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-text-muted">No tenés fechas próximas.</p>
          <Button variant="ghost" className="mt-3" onClick={onAdd}>
            <Icon name="plus" size={14} /> Agregar fecha
          </Button>
        </div>
      )}
    </HomePanel>
  )
}
