/**
 * Sesión de repaso de una tarjeta por vez (Fase 15): frente → mostrar dorso →
 * "La sabía" / "No la sabía". Al terminar muestra el resumen. Las tarjetas de
 * la sesión son una foto al empezar (no cambian mientras se repasa).
 * Ver docs/features/flashcards.md.
 *
 * @param {Object} props
 * @param {import('../../../types/models.js').Flashcard[]} props.cards
 * @param {(id: string, correct: boolean) => Promise<boolean>} props.onReview
 * @param {() => void} props.onDone
 */

import { useState } from 'react'
import { Button } from '../../ui/Button'
import { useI18n } from '../../../hooks/useI18n.js'

export function FlashcardReview({ cards, onReview, onDone }) {
  const { t } = useI18n()
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [known, setKnown] = useState(0)
  const [saving, setSaving] = useState(false)

  if (index >= cards.length) {
    return (
      <div className="glass mx-auto max-w-lg p-8 text-center">
        <h2 className="font-display text-xl font-bold">{t('flashcards.doneTitle')}</h2>
        <p className="mt-2 text-sm text-text-muted">{t('flashcards.doneMessage', { count: cards.length })}</p>
        <p className="mt-1 text-sm text-accent-soft">
          {known} / {cards.length}
        </p>
        <Button className="mt-6" onClick={onDone}>
          {t('flashcards.backToDeck')}
        </Button>
      </div>
    )
  }

  const card = cards[index]

  async function answer(correct) {
    if (saving) return
    setSaving(true)
    const ok = await onReview(card.id, correct)
    setSaving(false)
    if (!ok) return
    if (correct) setKnown((value) => value + 1)
    setRevealed(false)
    setIndex((value) => value + 1)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-3 text-center text-xs text-text-muted">
        {t('flashcards.progress', { current: index + 1, total: cards.length })}
      </p>
      <div className="paper-sheet rounded-md p-8 text-ink">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{t('flashcards.frontLabel')}</p>
        <p className="mt-2 whitespace-pre-wrap font-display text-xl font-semibold">{card.front}</p>

        {revealed && (
          <div className="mt-6 border-t border-paper-border pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{t('flashcards.backLabel')}</p>
            <p className="mt-2 whitespace-pre-wrap">{card.back}</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {!revealed ? (
          <Button onClick={() => setRevealed(true)}>{t('flashcards.show')}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => answer(false)} disabled={saving}>
              {t('flashcards.forgot')}
            </Button>
            <Button onClick={() => answer(true)} disabled={saving}>
              {t('flashcards.knew')}
            </Button>
          </>
        )}
      </div>

      <div className="mt-4 text-center">
        <button type="button" onClick={onDone} className="text-xs text-text-muted underline hover:text-text">
          {t('flashcards.backToDeck')}
        </button>
      </div>
    </div>
  )
}
