import { Link } from 'react-router-dom'
import { HomePanel } from './HomePanel'
import { ROUTES, subjectFolderPath } from '../../../constants/routes.js'
import { formatDateTime, formatRelativeTime } from '../../../lib/home/dates.js'

/**
 * "Seguí donde dejaste": la última hoja editada (sin título: materia + fecha +
 * primer renglón). Ver docs/features/home.md.
 * @param {Object} props
 * @param {import('../../../types/models.js').LastSheet|null} props.sheet
 * @param {boolean} props.loading
 * @param {string|null} props.error
 * @param {string} [props.className]
 */
export function ContinueCard({ sheet, loading, error, className = '' }) {
  return (
    <HomePanel title="Seguí donde dejaste" error={error} className={className}>
      {loading && !sheet ? (
        <p className="text-sm text-text-muted">Cargando…</p>
      ) : sheet ? (
        <Link
          to={subjectFolderPath(sheet.subject_id, sheet.id)}
          className="block rounded-lg border border-border bg-bg p-4 transition-colors hover:border-accent focus-visible:border-accent focus-visible:outline-none"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent"
              style={sheet.subject_color ? { backgroundColor: sheet.subject_color } : undefined}
              aria-hidden="true"
            />
            <span className="font-semibold text-text">{sheet.subject_name}</span>
            <span className="text-text-muted">· {formatDateTime(sheet.updated_at)}</span>
          </div>
          {sheet.preview && <p className="mt-2 line-clamp-2 text-sm text-text">{sheet.preview}</p>}
          <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
            <span>{formatRelativeTime(sheet.updated_at)}</span>
            <span className="font-medium text-accent">Seguir →</span>
          </div>
        </Link>
      ) : (
        <div>
          <p className="text-sm text-text-muted">Todavía no escribiste nada.</p>
          <Link to={ROUTES.careers} className="btn-accent mt-3 text-sm">
            Ir a mis carreras
          </Link>
        </div>
      )}
    </HomePanel>
  )
}
