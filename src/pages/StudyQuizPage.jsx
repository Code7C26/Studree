import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStudyItem } from '../hooks/useStudy.js'
import { QuizRecordView } from '../components/features/study/QuizRecordView'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Icon } from '../components/ui/Icon'
import { studyPath } from '../constants/routes'

/** `/estudio/examenes/:attemptId`: el registro de un examen. Ver docs/features/study.md. */
export function StudyQuizPage() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const { item, loading, error, remove } = useStudyItem('quiz', attemptId)
  const [confirm, setConfirm] = useState(false)
  const [failure, setFailure] = useState(/** @type {string|null} */ (null))

  const back = (
    <Link to={studyPath({ tab: 'examenes' })} className="inline-flex items-center gap-1 text-sm text-accent-soft hover:underline">
      Volver a Mi estudio
    </Link>
  )

  if (loading) return <p className="mt-10 text-center text-text-muted">Cargando…</p>
  if (!item) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        {back}
        <p role={error ? 'alert' : undefined} className="text-text-muted">
          {error ?? 'No encontramos ese examen (puede haberse borrado).'}
        </p>
      </div>
    )
  }

  const questions = Array.isArray(item.detail?.questions) ? item.detail.questions : null

  async function handleDelete() {
    setConfirm(false)
    const { error: err } = await remove()
    if (err) setFailure(err)
    else navigate(studyPath({ tab: 'examenes' }), { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {back}
      <div>
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-red-300"
        >
          <Icon name="trash" size={14} />
          Borrar
        </button>
      </div>
      {failure && (
        <p role="alert" className="text-xs text-red-300">
          {failure}
        </p>
      )}
      <QuizRecordView
        title={item.title}
        createdAt={item.created_at}
        score={{ total: item.total, correct: item.correct }}
        questions={questions}
      />
      <ConfirmDialog
        open={confirm}
        title="Borrar examen"
        message="¿Borrar este examen? No se puede deshacer."
        confirmLabel="Borrar"
        onConfirm={handleDelete}
        onCancel={() => setConfirm(false)}
      />
    </div>
  )
}
