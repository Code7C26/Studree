/**
 * Diálogo de "Foto a hoja" (Fase 16): prepara, transcribe y deja revisar el
 * Markdown antes de crear la hoja. Nada se guarda hasta "Crear hoja".
 * Ver docs/features/photo-notes.md.
 */

import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { useI18n } from '../../../hooks/useI18n.js'

/**
 * @param {Object} props
 * @param {ReturnType<typeof import('../../../hooks/usePhotoSheet.js').usePhotoSheet>} props.photo
 * @param {() => void} props.onRetake
 */
export function PhotoSheetDialog({ photo, onRetake }) {
  const { t } = useI18n()
  const { open, stage, preview, draft, setDraft, error, cancel, confirm } = photo
  const busy = stage === 'preparing' || stage === 'transcribing'

  return (
    <Modal open={open} onClose={cancel} title={t('camera.title')}>
      <div className="space-y-4">
        <p className="text-sm text-text-muted">{t('camera.intro')}</p>

        {preview && (
          <img
            src={preview}
            alt={t('camera.previewAlt')}
            className="max-h-56 w-full rounded-lg border border-border object-contain"
          />
        )}

        {busy && (
          <p role="status" className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-muted">
            {stage === 'preparing' ? t('camera.compressing') : t('camera.transcribing')}
          </p>
        )}

        {stage === 'error' && (
          <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {stage === 'review' && (
          <>
            <p className="text-xs text-text-muted">{t('camera.editHint')}</p>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
              className="min-h-[30dvh] w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-text outline-none focus:border-accent"
              aria-label={t('camera.editHint')}
            />
          </>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={cancel}>
            {t('camera.cancel')}
          </Button>
          {stage === 'review' && (
            <Button variant="ghost" onClick={onRetake}>
              {t('camera.retake')}
            </Button>
          )}
          {stage === 'error' && (
            <Button variant="ghost" onClick={onRetake}>
              {t('camera.takePhoto')}
            </Button>
          )}
          {stage === 'review' && (
            <Button onClick={confirm} disabled={!draft.trim()}>
              {t('camera.createSheet')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
