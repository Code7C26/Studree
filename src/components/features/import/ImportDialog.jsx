import { useEffect, useRef } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { useImport } from '../../../hooks/useImport.js'
import { MAX_ATTACHMENT_LABEL } from '../../../constants/attachmentLimits.js'
import { useI18n } from '../../../hooks/useI18n.js'

/**
 * Importar `.md` / `.zip`: elegir → resumen → importar (con progreso) → informe.
 * Ver docs/features/import.md.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {{mode: 'subject', subjectId: string, subjectName: string}|{mode: 'careers'}} props.target - Memorizado.
 */
export function ImportDialog({ open, onClose, target }) {
  const { t } = useI18n()
  const { phase, summary, summaryText, progress, report, error, prepare, run, reset } = useImport(target)
  const inputRef = useRef(null)
  const busy = phase === 'reading' || phase === 'importing'

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const intro =
    target.mode === 'subject'
      ? t('importExport.import.introSubject', { name: target.subjectName })
      : t('importExport.import.introCareers')

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={t('importExport.import.title')}>
      {phase === 'idle' && (
        <div className="space-y-3 text-sm">
          <p className="text-text-muted">{intro}</p>
          <p className="text-xs text-text-muted">
            {t('importExport.import.media', { limit: MAX_ATTACHMENT_LABEL })}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".md,.zip,text/markdown,application/zip"
            multiple
            hidden
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              event.target.value = ''
              if (files.length > 0) prepare(files)
            }}
          />
          {error && (
            <p role="alert" className="text-red-300">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="cancel" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => inputRef.current?.click()}>{t('importExport.import.choose')}</Button>
          </div>
        </div>
      )}

      {phase === 'reading' && <p className="text-sm text-text-muted">{t('importExport.import.reading')}</p>}

      {phase === 'ready' && (
        <div className="space-y-4 text-sm">
          <p className="text-text">{summaryText}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={reset}>
              {t('importExport.import.chooseOthers')}
            </Button>
            <Button onClick={run} disabled={!summary || summary.sheets === 0}>
              {t('importExport.import.run')}
            </Button>
          </div>
        </div>
      )}

      {phase === 'importing' && (
        <div className="space-y-2 text-sm">
          <p className="text-text-muted">
            {t('importExport.import.progress', { done: progress.done, total: progress.total })}
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={t('importExport.import.progressLabel')}
            className="h-2 overflow-hidden rounded-full bg-surface-2"
          >
            <div className="h-full bg-accent transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {phase === 'done' && report && (
        <div className="space-y-3 text-sm">
          <p className="text-text">
            {t('importExport.import.done', {
              sheets: t('importExport.counts.sheets', { count: report.sheets }),
              attachments: t('importExport.counts.attachments', { count: report.attachments }),
            })}
          </p>
          {report.failures.length > 0 && (
            <div>
              <p className="mb-1 text-text-muted">{t('importExport.import.failedTitle')}</p>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-bg p-2 text-xs">
                {report.failures.map((failure) => (
                  <li key={`${failure.path}:${failure.reason}`}>
                    <span className="text-text">{failure.path}</span> <span className="text-text-muted">({failure.reason})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={onClose}>{t('common.close')}</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
