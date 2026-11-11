import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStudy } from '../hooks/useStudy.js'
import { StudyItemRow } from '../components/features/study/StudyItemRow'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { studyPath, studyQuizPath, studySummaryPath } from '../constants/routes'
import { filterBySubject, filterOptions, itemTitle } from '../lib/assistant/studyItems.js'
import { useI18n } from '../hooks/useI18n.js'

const TABS = [
  { id: 'resumenes', labelKey: 'study.page.tabSummaries' },
  { id: 'examenes', labelKey: 'study.page.tabQuizzes' },
]

/**
 * `/estudio`: resúmenes y exámenes guardados, con pestañas y filtro por materia.
 * Ver docs/features/study.md.
 */
export function StudyPage() {
  const { t } = useI18n()
  const { summaries, attempts, loading, error, remove } = useStudy()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'examenes' ? 'examenes' : 'resumenes'
  const subjectId = params.get('materia')
  const [confirm, setConfirm] = useState(/** @type {{kind: 'summary'|'quiz', id: string}|null} */ (null))
  const [removeError, setRemoveError] = useState(/** @type {string|null} */ (null))

  const isSummaries = tab === 'resumenes'
  const rows = isSummaries ? summaries : attempts
  const options = useMemo(() => filterOptions(summaries, attempts, subjectId), [summaries, attempts, subjectId])
  const activeSubject = subjectId
  const visible = useMemo(() => filterBySubject(rows, activeSubject), [rows, activeSubject])

  const go = (/** @type {{tab?: string, subjectId?: string|null}} */ next) => {
    const href = studyPath({
      tab: next.tab ?? tab,
      subjectId: next.subjectId === undefined ? activeSubject : next.subjectId,
    })
    const query = href.includes('?') ? href.slice(href.indexOf('?')) : ''
    setParams(new URLSearchParams(query))
  }

  async function handleConfirm() {
    const pending = confirm
    setConfirm(null)
    if (!pending) return
    const { error: failure } = await remove(pending.kind, pending.id)
    setRemoveError(failure)
  }

  const kind = isSummaries ? 'summary' : 'quiz'

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold">{t('study.page.title')}</h1>
      <p className="mt-1 text-sm text-text-muted">{t('study.page.subtitle')}</p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label={t('study.page.title')} className="flex gap-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`study-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls="study-panel"
              onClick={() => go({ tab: item.id })}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                tab === item.id ? 'bg-surface-2 font-medium text-accent-soft' : 'text-text-muted hover:text-text'
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          {t('study.page.subject')}
          <select
            value={activeSubject ?? ''}
            onChange={(e) => go({ subjectId: e.target.value || null })}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text"
          >
            <option value="">{t('study.page.allSubjects')}</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {(error || removeError) && (
        <p role="alert" className="mt-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {removeError ?? error}
        </p>
      )}

      <div role="tabpanel" id="study-panel" aria-labelledby={`study-tab-${tab}`} className="mt-4">
        {loading ? (
          <p className="mt-10 text-center text-text-muted">{t('common.loading')}</p>
        ) : visible.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<Icon name="file-text" size={32} className="text-text-muted" />}
              title={isSummaries ? t('study.page.emptySummariesTitle') : t('study.page.emptyQuizzesTitle')}
              message={
                isSummaries
                  ? t(activeSubject ? 'study.page.emptySummariesSubject' : 'study.page.emptySummaries')
                  : t(activeSubject ? 'study.page.emptyQuizzesSubject' : 'study.page.emptyQuizzes')
              }
            />
          </div>
        ) : (
          <ul>
            {visible.map((row) => (
              <StudyItemRow
                key={row.id}
                to={isSummaries ? studySummaryPath(row.id) : studyQuizPath(row.id)}
                title={isSummaries ? row.title : itemTitle(row)}
                subjectName={row.subject?.name}
                createdAt={row.created_at}
                detail={isSummaries ? undefined : t('study.page.score', { correct: row.correct, total: row.total })}
                deleteLabel={t(isSummaries ? 'study.page.deleteSummaryLabel' : 'study.page.deleteQuizLabel', { title: isSummaries ? row.title : itemTitle(row) })}
                onDelete={() => setConfirm({ kind, id: row.id })}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={t(isSummaries ? 'study.page.deleteSummaryTitle' : 'study.page.deleteQuizTitle')}
        message={t(isSummaries ? 'study.page.deleteSummaryMessage' : 'study.page.deleteQuizMessage')}
        confirmLabel={t('study.page.delete')}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
