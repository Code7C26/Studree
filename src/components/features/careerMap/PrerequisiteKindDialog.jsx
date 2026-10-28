/**
 * Al unir dos materias en el canvas, pregunta qué tipo de correlativa es.
 * Ver docs/features/career-map.md.
 */

import { useEffect, useState } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { PREREQUISITE_KINDS, PREREQUISITE_KIND_META } from '../../../constants/prerequisiteKinds.js'
import { useI18n } from '../../../hooks/useI18n.js'

/**
 * @param {Object} props
 * @param {{requires: {name: string}, subject: {name: string}}|null} props.connection - null = cerrado.
 * @param {(kind: import('../../../types/models.js').PrerequisiteKind) => Promise<string|null>} props.onConfirm
 * @param {() => void} props.onClose
 */
export function PrerequisiteKindDialog({ connection, onConfirm, onClose }) {
  const { t } = useI18n()
  const [kind, setKind] = useState(PREREQUISITE_KINDS.cursar)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (connection) {
      setKind(PREREQUISITE_KINDS.cursar)
      setError(null)
      setSaving(false)
    }
  }, [connection])

  async function handleConfirm() {
    setSaving(true)
    const failure = await onConfirm(kind)
    setSaving(false)
    if (failure) setError(failure)
    else onClose()
  }

  return (
    <Modal open={connection != null} onClose={onClose} title={t('careerMap.kindDialog.title')}>
      {connection && (
        <div className="space-y-4">
          <p className="text-sm">
            <span className="font-semibold">{connection.subject.name}</span>
            <span className="text-text-muted"> {t('careerMap.kindDialog.requires')} </span>
            <span className="font-semibold">{connection.requires.name}</span>
          </p>

          <div className="grid gap-2">
            {Object.values(PREREQUISITE_KINDS).map((value) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors ${
                  kind === value ? 'border-accent bg-accent/10' : 'border-border hover:bg-surface-2'
                }`}
              >
                <input type="radio" name="prereq-kind" className="mt-1" checked={kind === value} onChange={() => setKind(value)} />
                <span>
                  <span className="block text-sm font-medium">{t(PREREQUISITE_KIND_META[value].labelKey)}</span>
                  <span className="block text-xs text-text-muted">{t(PREREQUISITE_KIND_META[value].helpKey)}</span>
                </span>
              </label>
            ))}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving ? t('common.saving') : t('careerMap.kindDialog.create')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
