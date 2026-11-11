import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStudyItem } from '../hooks/useStudy.js'
import { usePrintSummary } from '../hooks/usePrintSummary.js'
import { useSaveSummaryAsSheet } from '../hooks/useSaveSummaryAsSheet.js'
import { SummaryDocument } from '../components/features/study/SummaryDocument'
import { SummaryPrint } from '../components/features/study/SummaryPrint'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Icon } from '../components/ui/Icon'
import { studyPath } from '../constants/routes'
import { rowToSummary } from '../lib/assistant/summaryDoc.js'
import { useI18n } from '../hooks/useI18n.js'

const BUTTON =
  'inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text disabled:opacity-50'

/** `/estudio/resumenes/:summaryId`: un resumen guardado. Ver docs/features/study.md. */
export function StudySummaryPage() {
  const { t } = useI18n()
  const { summaryId } = useParams()
  const navigate = useNavigate()
  const { item, loading, error, remove } = useStudyItem('summary', summaryId)
  const { printing, print } = usePrintSummary()
  const { save } = useSaveSummaryAsSheet()
  const [confirm, setConfirm] = useState(false)
  const [message, setMessage] = useState(/** @type {{ok: boolean, text: string}|null} */ (null))

  const back = (
    <Link to={studyPath()} className="inline-flex items-center gap-1 text-sm text-accent-soft hover:underline">
      {t('study.page.back')}
    </Link>
  )

  if (loading) return <p className="mt-10 text-center text-text-muted">{t('common.loading')}</p>
  if (!item) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        {back}
        <p role={error ? 'alert' : undefined} className="text-text-muted">
          {error ?? t('study.page.summaryNotFound')}
        </p>
      </div>
    )
  }

  const doc = rowToSummary(item)

  const saveAsSheet = () => {
    const result = save(doc)
    if (!result.ok) setMessage({ ok: false, text: result.error ?? t('study.summary.sheetFailed') })
    else if (result.inFolder) setMessage({ ok: true, text: t('study.page.addedAsSheet') })
  }

  async function handleDelete() {
    setConfirm(false)
    const { error: failure } = await remove()
    if (failure) setMessage({ ok: false, text: failure })
    else navigate(studyPath({ tab: 'resumenes' }), { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {back}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => print(doc)}
          disabled={Boolean(printing)}
          className="btn-accent inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
        >
          <Icon name="arrow-down" size={14} />
          {t('study.summary.download')}
        </button>
        {doc.subjectId && (
          <button type="button" onClick={saveAsSheet} className={BUTTON}>
            <Icon name="file-text" size={14} />
            {t('study.summary.saveAsSheet')}
          </button>
        )}
        <button type="button" onClick={() => setConfirm(true)} className={`${BUTTON} hover:text-red-300`}>
          <Icon name="trash" size={14} />
          {t('study.page.delete')}
        </button>
      </div>
      <p className="text-xs text-text-muted">{t('study.summary.pdfHint')}</p>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`text-xs ${message.ok ? 'text-accent-soft' : 'text-red-300'}`}>
          {message.text}
        </p>
      )}
      <div className="paper-sheet p-5 sm:p-8">
        <SummaryDocument doc={doc} />
      </div>
      {printing && <SummaryPrint doc={printing} />}
      <ConfirmDialog
        open={confirm}
        title={t('study.page.deleteSummaryTitle')}
        message={t('study.page.deleteSummaryMessage')}
        confirmLabel={t('study.page.delete')}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(false)}
      />
    </div>
  )
}
