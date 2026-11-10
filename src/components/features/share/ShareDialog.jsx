/**
 * Diálogo para compartir una materia por link (Fase 15). Ver docs/features/share.md.
 * Genera, copia y revoca; el link público es de solo lectura.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.subjectId
 */

import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { Icon } from '../../ui/Icon'
import { useSharedLink } from '../../../hooks/useSharedLink.js'
import { useI18n } from '../../../hooks/useI18n.js'

export function ShareDialog({ open, onClose, subjectId }) {
  const { t } = useI18n()
  const { link, url, loading, busy, error, create, revoke, copy, clearError } = useSharedLink(subjectId)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const inputRef = useRef(/** @type {HTMLInputElement|null} */ (null))

  useEffect(() => {
    if (!open) {
      setCopied(false)
      setCopyFailed(false)
      setConfirmRevoke(false)
      clearError()
    }
  }, [open, clearError])

  async function handleCopy() {
    const ok = await copy()
    setCopied(ok)
    setCopyFailed(!ok)
    if (!ok) inputRef.current?.select()
  }

  async function handleRevoke() {
    setConfirmRevoke(false)
    await revoke()
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={t('share.dialogTitle')}>
        <p className="text-sm text-text-muted">{t('share.intro')}</p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-text-muted">{t('common.loading')}</p>
        ) : link ? (
          <div className="mt-4 space-y-3">
            <input
              ref={inputRef}
              readOnly
              value={url ?? ''}
              onFocus={(event) => event.target.select()}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
              aria-label={t('share.dialogTitle')}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={handleCopy}>
                <Icon name="link" size={16} /> {t('share.copy')}
              </Button>
              <Button variant="danger" onClick={() => setConfirmRevoke(true)} disabled={busy}>
                {t('share.revoke')}
              </Button>
            </div>
            {copied && (
              <p role="status" className="text-xs text-accent-soft">
                {t('share.copied')}
              </p>
            )}
            {copyFailed && (
              <p role="status" className="text-xs text-warn">
                {t('share.copyFailed')}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-text-muted">{t('share.noLink')}</p>
            <div className="flex justify-end gap-2">
              <Button onClick={create} disabled={busy}>
                <Icon name="link" size={16} /> {busy ? t('share.generating') : t('share.generate')}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t('share.close')}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmRevoke}
        title={t('share.revokeTitle')}
        message={t('share.revokeMessage')}
        confirmLabel={t('share.revokeConfirm')}
        onConfirm={handleRevoke}
        onCancel={() => setConfirmRevoke(false)}
      />
    </>
  )
}
