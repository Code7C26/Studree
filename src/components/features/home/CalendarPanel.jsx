import { useState } from 'react'
import { HomePanel } from './HomePanel'
import { Button } from '../../ui/Button'
import { WEEKDAY_HEADERS, buildMonthGrid, shiftMonth } from '../../../lib/home/calendar.js'
import { daysUntil, formatCountdown, formatMonthTitle, formatShortDate, parseDateKey } from '../../../lib/home/dates.js'
import { Icon } from '../../ui/Icon'

const NAV_BUTTON =
  'flex h-10 w-10 items-center justify-center rounded-lg text-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text'

/**
 * Mes chico (hoy en verde; días con fecha subrayados en ámbar; punto gris =
 * vencen tareas) + "Próximas".
 * Click en un día = nueva fecha ese día. Ver docs/features/home.md.
 * @param {Object} props
 * @param {string} props.todayKey
 * @param {import('../../../types/models.js').ImportantDate[]} props.upcoming
 * @param {Map<string, {dates: boolean, tasks: boolean}>} props.markers
 * @param {boolean} props.loading
 * @param {string|null} props.error
 * @param {(key: string) => void} props.onAddDate
 * @param {(date: import('../../../types/models.js').ImportantDate) => void} props.onEditDate
 * @param {string} [props.className]
 */
export function CalendarPanel({ todayKey, upcoming, markers, loading, error, onAddDate, onEditDate, className = '' }) {
  const [view, setView] = useState(() => {
    const today = parseDateKey(todayKey)
    return { year: today.getFullYear(), month: today.getMonth() }
  })
  const grid = buildMonthGrid(view.year, view.month)
  const move = (delta) => setView((current) => shiftMonth(current.year, current.month, delta))

  return (
    <HomePanel
      title="Calendario"
      error={error}
      className={className}
      action={
        <Button variant="ghost" className="px-3 py-1.5" onClick={() => onAddDate(todayKey)}>
          <Icon name="plus" size={14} /> Fecha
        </Button>
      }
    >
      <div className="flex items-center justify-between">
        <button type="button" className={NAV_BUTTON} onClick={() => move(-1)} aria-label="Mes anterior">
          <Icon name="chevron-left" />
        </button>
        <p className="text-sm font-semibold text-text">{formatMonthTitle(view.year, view.month)}</p>
        <button type="button" className={NAV_BUTTON} onClick={() => move(1)} aria-label="Mes siguiente">
          <Icon name="chevron-right" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-center tabular-nums">
        {WEEKDAY_HEADERS.map((header, index) => (
          <span key={index} className="py-1 text-xs text-text-muted" aria-hidden="true">
            {header}
          </span>
        ))}
        {grid.flat().map((cell) => {
          const marker = markers.get(cell.key)
          const isToday = cell.key === todayKey
          const label = [
            formatShortDate(cell.key),
            marker?.dates ? 'con fechas' : null,
            marker?.tasks ? 'vencen tareas' : null,
            'agregar fecha',
          ]
            .filter(Boolean)
            .join(', ')
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onAddDate(cell.key)}
              aria-label={label}
              aria-current={isToday ? 'date' : undefined}
              className={`flex h-10 flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors ${
                isToday ? 'bg-accent font-semibold text-bg hover:bg-accent-hover' : 'hover:bg-surface-2'
              } ${isToday ? '' : cell.inMonth ? 'text-text' : 'text-text-muted/50'}`}
            >
              <span
                className={marker?.dates && !isToday ? 'underline decoration-warn decoration-2 underline-offset-4' : ''}
              >
                {cell.day}
              </span>
              <span className="flex h-1.5 gap-0.5" aria-hidden="true">
                {marker?.dates && <span className="h-1.5 w-1.5 rounded-full bg-warn" />}
                {marker?.tasks && <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-2 flex gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-warn" aria-hidden="true" /> Fecha
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-text-muted" aria-hidden="true" /> Vence una tarea
        </span>
      </p>

      <h3 className="mt-4 text-sm font-medium text-text-muted">Próximas</h3>
      {loading && upcoming.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">Cargando…</p>
      ) : upcoming.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">Sin fechas próximas. Tocá un día para agregar una.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {upcoming.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onEditDate(item)}
                className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-surface-2"
              >
                <span className="w-20 shrink-0 tabular-nums text-text-muted">{formatShortDate(item.date)}</span>
                <span className="min-w-0 flex-1 truncate text-text">{item.title}</span>
                <span className="shrink-0 text-xs text-warn">{formatCountdown(daysUntil(item.date, todayKey))}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </HomePanel>
  )
}
