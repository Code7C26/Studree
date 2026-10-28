import { Link } from 'react-router-dom'
import { HomePanel } from './HomePanel'
import { ROUTES, subjectFolderPath } from '../../../constants/routes.js'
import { formatRelativeTime } from '../../../lib/home/dates.js'
import { getSubjectTones } from '../../../constants/subjectTones.js'
import { Icon } from '../../ui/Icon'
import { useI18n } from '../../../hooks/useI18n.js'

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
  const { t, lang } = useI18n()
  return (
    <HomePanel title={t('home.continue.title')} error={error} variant="hero" className={className}>
      {loading && !sheet ? (
        <p className="text-sm text-text-muted">{t('common.loading')}</p>
      ) : sheet ? (
        <Link to={subjectFolderPath(sheet.subject_id, sheet.id)} className="group block rounded-xl sm:min-h-[13rem]">
          <p className="font-display text-2xl font-bold text-text">{sheet.subject_name}</p>
          <p className="mt-0.5 text-sm text-text-muted">{t('home.continue.wrote', { when: formatRelativeTime(sheet.updated_at, new Date(), lang) })}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-soft">
            {t('home.continue.keepWriting')} <Icon name="chevron-right" size={14} />
          </span>
          {sheet.preview && (
            <div
              aria-hidden="true"
              className="paper-sheet motion-peek pointer-events-none absolute -bottom-8 right-6 hidden h-40 w-64 -rotate-[4deg] overflow-hidden rounded-md border-l-[5px] px-4 py-3 text-xs leading-[1.6] transition-transform duration-200 group-hover:-translate-y-2 group-hover:-rotate-[2deg] sm:block"
              style={{ borderLeftColor: getSubjectTones(sheet.subject_color).base }}
            >
              <p className="line-clamp-5">{sheet.preview}</p>
            </div>
          )}
        </Link>
      ) : (
        <div>
          <p className="text-sm text-text-muted">{t('home.continue.empty')}</p>
          <Link to={ROUTES.careers} className="btn-accent mt-3 text-sm">
            {t('home.continue.goCareers')}
          </Link>
        </div>
      )}
    </HomePanel>
  )
}
