import { Link } from 'react-router-dom'
import { HomePanel } from './HomePanel'
import { ROUTES, subjectFolderPath } from '../../../constants/routes.js'
import { formatRelativeTime } from '../../../lib/home/dates.js'
import { getSubjectTones } from '../../../constants/subjectTones.js'
import { Icon } from '../../ui/Icon'

/**
 * "Seguí donde dejaste": la última hoja editada (sin título: materia + fecha +
 * primer renglón). Bloque protagonista del Inicio, con la hoja asomando
 * (ADR-018). Ver docs/features/home.md.
 * @param {Object} props
 * @param {import('../../../types/models.js').LastSheet|null} props.sheet
 * @param {boolean} props.loading
 * @param {string|null} props.error
 * @param {string} [props.className]
 */
export function ContinueCard({ sheet, loading, error, className = '' }) {
  return (
    <HomePanel title="Seguí donde dejaste" error={error} variant="hero" className={className}>
      {loading && !sheet ? (
        <p className="text-sm text-text-muted">Cargando…</p>
      ) : sheet ? (
        <Link to={subjectFolderPath(sheet.subject_id, sheet.id)} className="group block min-h-[9.5rem] rounded-xl">
          <p className="font-display text-2xl font-bold text-text">{sheet.subject_name}</p>
          <p className="mt-0.5 text-sm text-text-muted">Escribiste {formatRelativeTime(sheet.updated_at)}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-soft">
            Seguir escribiendo <Icon name="chevron-right" size={14} />
          </span>
          {sheet.preview && (
            <div
              aria-hidden="true"
              className="paper-sheet motion-peek pointer-events-none absolute -bottom-5 -right-1 hidden w-48 -rotate-[4deg] rounded-md border-l-[5px] px-3 py-2 text-xs leading-[1.4] transition-transform duration-200 group-hover:-translate-y-1 group-hover:-rotate-[2deg] sm:block"
              style={{ borderLeftColor: getSubjectTones(sheet.subject_color).base }}
            >
              <p className="line-clamp-4">{sheet.preview}</p>
            </div>
          )}
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
