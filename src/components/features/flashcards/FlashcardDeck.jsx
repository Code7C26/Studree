/**
 * Lista del mazo de tarjetas (Fase 15). Solo presentación: la página decide
 * qué hacer con editar y borrar. Ver docs/features/flashcards.md.
 *
 * @param {Object} props
 * @param {import('../../../types/models.js').Flashcard[]} props.cards
 * @param {(card: import('../../../types/models.js').Flashcard) => void} props.onEdit
 * @param {(card: import('../../../types/models.js').Flashcard) => void} props.onDelete
 */

import { Icon } from '../../ui/Icon'
import { useI18n } from '../../../hooks/useI18n.js'
import { boxLabel, isDue } from '../../../lib/flashcards/srs.js'
import { formatNumericDate, formatTime } from '../../../lib/format/dateParts.js'

/** @param {string} iso @param {string} lang */
const dueText = (iso, lang) => `${formatNumericDate(new Date(iso), lang)} ${formatTime(new Date(iso), lang)}`

export function FlashcardDeck({ cards, onEdit, onDelete }) {
  const { t, lang } = useI18n()
  return (
    <ul className="space-y-3">
      {cards.map((card) => {
        const due = isDue(card)
        return (
          <li key={card.id} className="glass flex items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap text-sm font-medium">{card.front}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text-muted">{card.back}</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <span className="rounded-full border border-border px-2 py-0.5">{t(boxLabel(card.box))}</span>
                <span className={due ? 'text-accent-soft' : ''}>
                  {due ? t('flashcards.dueNow') : t('flashcards.nextReview', { date: dueText(card.due_at, lang) })}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => onEdit(card)}
                aria-label={t('flashcards.edit')}
                title={t('flashcards.edit')}
                className="rounded p-1.5 text-text-muted hover:bg-surface-2 hover:text-text"
              >
                <Icon name="edit" size={15} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(card)}
                aria-label={t('flashcards.delete')}
                title={t('flashcards.delete')}
                className="rounded p-1.5 text-text-muted hover:bg-surface-2 hover:text-red-400"
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
