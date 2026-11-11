import { useState } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'
import { HOME_LIMITS } from '../../../constants/homeLimits.js'
import { useI18n } from '../../../hooks/useI18n.js'

/**
 * Crear / editar / borrar una fecha importante (título + día).
 * El padre lo monta solo cuando está abierto: el estado sale de `initial`.
 * La confirmación de borrado va dentro del mismo modal, para no apilar dos
 * modales que se cerrarían juntos con Escape.
 * @param {Object} props
 * @param {{id?: string, title: string, date: string}} props.initial
 * @param {() => void} props.onClose
 * @param {(values: {title: string, date: string}) => Promise<string|null>} props.onSave
 * @param {(id: string) => Promise<string|null>} props.onDelete
 */
export function DateFormModal({ initial, onClose, onSave, onDelete }) {
  const { t } = useI18n()
  const [title, setTitle] = useState(initial.title)
  const [date, setDate] = useState(initial.date)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const isEditing = Boolean(initial.id)

  /** @param {React.FormEvent} event */
  async function handleSubmit(event) {
    event.preventDefault()
    if (!title.trim()) return setError(t('home.dateForm.needTitle'))
    if (!date) return setError(t('home.dateForm.needDay'))
    setSaving(true)
    const saveError = await onSave({ title, date })
    setSaving(false)
    if (saveError) setError(saveError)
    else onClose()
  }

  async function handleDelete() {
    setSaving(true)
    const deleteError = await onDelete(initial.id)
    setSaving(false)
    if (deleteError) {
      setError(deleteError)
      setConfirmingDelete(false)
    } else {
      onClose()
    }
  }

  return (
    <Modal open onClose={onClose} title={isEditing ? t('home.dateForm.editTitle') : t('home.dateForm.newTitle')}>
      {confirmingDelete ? (
        <div>
          <p className="text-sm text-text-muted">{t('home.dateForm.confirmDelete', { title: initial.title })}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="cancel" onClick={() => setConfirmingDelete(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={saving}>
              {t('home.dateForm.delete')}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            id="important-date-title"
            label={t('home.dateForm.whatLabel')}
            placeholder={t('home.dateForm.whatPlaceholder')}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={HOME_LIMITS.dateTitle}
            autoFocus
            required
          />
          <TextField
            id="important-date-day"
            label={t('home.dateForm.dayLabel')}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
          {error && (
            <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            {isEditing ? (
              <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(true)} disabled={saving}>
                {t('home.dateForm.delete')}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="cancel" onClick={onClose} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
