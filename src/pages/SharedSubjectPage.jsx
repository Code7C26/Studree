/**
 * Materia compartida por link (Fase 15): vista pública de solo lectura, fuera
 * del layout de la app (sin header ni explorador). Ver docs/features/share.md.
 *
 * El contenido llega por la RPC `get_shared_subject`; los adjuntos se quitaron
 * del Markdown antes de renderizar (`lib/share/publicMarkdown.js`).
 */

import { Link, useParams } from 'react-router-dom'
import { SheetEditor } from '../components/features/sheetEditor/SheetEditor'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { usePublicSubject } from '../hooks/usePublicSubject.js'
import { useI18n } from '../hooks/useI18n.js'
import { ROUTES } from '../constants/routes.js'
import { subjectCssVars } from '../constants/subjectTones.js'
import { formatSheetDateLong } from '../lib/format/sheetDate.js'
import { toPublicMarkdown } from '../lib/share/publicMarkdown.js'

export function SharedSubjectPage() {
  const { t } = useI18n()
  const { token } = useParams()
  const { subject, loading, error } = usePublicSubject(token)

  return (
    <div className="min-h-screen bg-bg px-4 py-10 text-text">
      <div className="mx-auto w-full max-w-[46rem]">
        <header className="mb-6 flex items-center justify-between gap-3">
          <Link to={ROUTES.home} className="font-display text-lg font-bold tracking-tight">
            Studree
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-text-muted">
            <Icon name="lock" size={13} /> {t('share.readOnly')}
          </span>
        </header>

        {loading ? (
          <p className="mt-16 text-center text-text-muted">{t('share.loading')}</p>
        ) : error ? (
          <EmptyState title={t('share.notFoundTitle')} message={error} />
        ) : !subject ? (
          <EmptyState
            title={t('share.notFoundTitle')}
            message={t('share.notFoundMessage')}
            action={
              <Link to={ROUTES.home} className="text-sm text-accent-soft hover:text-accent">
                {t('share.goHome')}
              </Link>
            }
          />
        ) : (
          <div style={subjectCssVars(subject.subject.color)}>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
              <span
                className="h-3 w-3 shrink-0 rounded-full bg-[var(--subject)] shadow-[0_0_10px_var(--subject)]"
                aria-hidden="true"
              />
              <span className="truncate">{subject.subject.name}</span>
            </h1>
            <p className="mb-6 mt-1 text-sm text-text-muted">{t('share.publicCareer', { name: subject.career.name })}</p>

            {subject.sheets.length === 0 ? (
              <EmptyState title={t('share.emptySubject')} />
            ) : (
              <div className="space-y-8 pb-16">
                {subject.sheets.map((sheet) => (
                  <article key={sheet.id} className="paper-sheet rounded-md border-l-[6px] border-[var(--subject)]">
                    <header className="border-b border-paper-border px-7 py-2 text-xs font-medium text-ink-muted">
                      {formatSheetDateLong(sheet.created_at)}
                    </header>
                    <div className="px-7 py-5">
                      <SheetEditor content={toPublicMarkdown(sheet.content_md)} onChange={() => {}} editable={false} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
