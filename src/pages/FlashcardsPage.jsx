/**
 * Mazo de tarjetas de una materia (Fase 15): lista, alta/edición y repaso con
 * cajas de Leitner. Ruta `/materias/:subjectId/tarjetas` (con sesión).
 * Ver docs/features/flashcards.md.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { subjectsService } from '../services/subjects.service.js'
import { useFlashcards } from '../hooks/useFlashcards.js'
import { useI18n } from '../hooks/useI18n.js'
import { FlashcardDeck } from '../components/features/flashcards/FlashcardDeck'
import { FlashcardForm } from '../components/features/flashcards/FlashcardForm'
import { FlashcardReview } from '../components/features/flashcards/FlashcardReview'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { subjectFolderPath } from '../constants/routes.js'

export function FlashcardsPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { subjectId } = useParams()
  const { cards, due, loading, error, clearError, create, update, remove, review } = useFlashcards(subjectId)
  const [subject, setSubject] = useState(/** @type {import('../types/models.js').Subject|null} */ (null))
  const [subjectError, setSubjectError] = useState(/** @type {string|null} */ (null))
  const [subjectLoading, setSubjectLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCard, setEditingCard] = useState(/** @type {import('../types/models.js').Flashcard|null} */ (null))
  const [pendingDelete, setPendingDelete] = useState(/** @type {import('../types/models.js').Flashcard|null} */ (null))
  const [session, setSession] = useState(/** @type {import('../types/models.js').Flashcard[]|null} */ (null))

  useEffect(() => {
    let active = true
    subjectsService.get(subjectId).then(({ data, error: message }) => {
      if (!active) return
      setSubject(data)
      setSubjectError(message)
      setSubjectLoading(false)
    })
    return () => {
      active = false
    }
  }, [subjectId])

  function openNew() {
    setEditingCard(null)
    setFormOpen(true)
  }

  function openEdit(card) {
    setEditingCard(card)
    setFormOpen(true)
  }

  async function handleSubmit(values) {
    const ok = editingCard ? await update(editingCard.id, values) : await create(values)
    return ok
  }

  if (!subjectLoading && (!subject || subjectError)) {
    return <EmptyState title={t('flashcards.subjectNotFound')} message={subjectError} />
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link to={subjectFolderPath(subjectId)} className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text">
        <Icon name="chevron-left" size={14} /> {t('flashcards.backToFolder')}
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{subject?.name ?? t('common.loading')}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {t('flashcards.total', { count: cards.length })} · {t('flashcards.due', { count: due.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => setSession(due.slice())}
            disabled={due.length === 0 || session != null}
          >
            <Icon name="book-open" size={16} /> {t('flashcards.review')}
          </Button>
          <Button onClick={openNew} disabled={session != null}>
            <Icon name="plus" size={16} /> {t('flashcards.new')}
          </Button>
        </div>
      </div>

      {(error || subjectError) && (
        <p role="alert" className="mb-4 flex items-start justify-between gap-2 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          <span>{error ?? subjectError}</span>
          <button type="button" onClick={clearError} aria-label={t('folder.page.dismiss')}>
            <Icon name="close" size={14} />
          </button>
        </p>
      )}

      {session ? (
        <FlashcardReview cards={session} onReview={review} onDone={() => setSession(null)} />
      ) : loading ? (
        <p className="mt-10 text-center text-text-muted">{t('common.loading')}</p>
      ) : cards.length === 0 ? (
        <EmptyState
          title={t('flashcards.emptyTitle')}
          message={t('flashcards.emptyMessage')}
          action={<Button onClick={openNew}>{t('flashcards.new')}</Button>}
        />
      ) : (
        <>
          {due.length === 0 && (
            <p className="mb-4 rounded-lg border border-border px-3 py-2 text-sm text-text-muted">
              {t('flashcards.nothingDue')}
            </p>
          )}
          <FlashcardDeck cards={cards} onEdit={openEdit} onDelete={setPendingDelete} />
        </>
      )}

      <FlashcardForm open={formOpen} initial={editingCard} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} />

      <ConfirmDialog
        open={pendingDelete != null}
        title={t('flashcards.deleteTitle')}
        message={t('flashcards.deleteMessage')}
        confirmLabel={t('flashcards.delete')}
        onConfirm={async () => {
          const card = pendingDelete
          setPendingDelete(null)
          if (card) await remove(card.id)
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <div className="mt-8">
        <button type="button" onClick={() => navigate(subjectFolderPath(subjectId))} className="text-xs text-text-muted underline hover:text-text">
          {t('flashcards.backToFolder')}
        </button>
      </div>
    </div>
  )
}
