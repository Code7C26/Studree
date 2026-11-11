/**
 * Alta y edición de una tarjeta (Fase 15). La base exige frente y dorso de
 * 1 a 2000 caracteres; se valida acá para avisar antes. Ver docs/features/flashcards.md.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {import('../../../types/models.js').Flashcard|null} props.initial
 * @param {() => void} props.onClose
 * @param {(values: {front: string, back: string}) => Promise<boolean>} props.onSubmit
 */

import { useEffect, useState } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { useI18n } from '../../../hooks/useI18n.js'

export const FLASHCARD_MAX = 2000

export function FlashcardForm({ open, initial, onClose, onSubmit }) {
  const { t } = useI18n()
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setFront(initial?.front ?? '')
    setBack(initial?.back ?? '')
    setSaving(false)
  }, [open, initial])

  const valid = front.trim().length > 0 && back.trim().length > 0

  async function handleSubmit(event) {
    event.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    const ok = await onSubmit({ front: front.trim(), back: back.trim() })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? t('flashcards.editTitle') : t('flashcards.newTitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t('flashcards.front')}</span>
          <textarea
            value={front}
            onChange={(event) => setFront(event.target.value)}
            maxLength={FLASHCARD_MAX}
            rows={3}
            autoFocus
            placeholder={t('flashcards.frontPlaceholder')}
            className="w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t('flashcards.back')}</span>
          <textarea
            value={back}
            onChange={(event) => setBack(event.target.value)}
            maxLength={FLASHCARD_MAX}
            rows={3}
            placeholder={t('flashcards.backPlaceholder')}
            className="w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('flashcards.cancel')}
          </Button>
          <Button type="submit" disabled={!valid || saving}>
            {t('flashcards.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
