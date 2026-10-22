import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../ui/Icon'
import { studyQuizPath } from '../../../constants/routes'
import { canRetrySave } from '../../../lib/assistant/quizSession.js'
import { QuizRecordView } from '../study/QuizRecordView'

const TYPE_LABEL = { mcq: 'Opción múltiple', tf: 'Verdadero o falso', open: 'Desarrollo' }
const TF_OPTIONS = [
  { value: true, label: 'Verdadero' },
  { value: false, label: 'Falso' },
]
const BUTTON = 'rounded-lg border border-border px-3 py-1 text-sm text-text-muted transition-colors hover:text-text disabled:opacity-50'

/**
 * @typedef {import('../../../lib/assistant/quizScore.js').Question} Question
 * @typedef {import('../../../hooks/useAssistant.js').QuizSession} QuizSession
 * @typedef {import('../../../hooks/useAssistant.js').QuizOutcome} QuizOutcome
 */

/** ¿La pregunta tiene respuesta? (una abierta, con texto). */
function isAnswered(question, value) {
  if (question.type === 'open') return typeof value === 'string' && value.trim() !== ''
  return value !== undefined
}

/**
 * Contenido del examen dentro de `QuizWindow`: una pregunta por vez (radios
 * para opción múltiple y verdadero/falso, textarea con etiqueta para
 * desarrollo), encabezado con título, "Pregunta 3 de 10" y barra de progreso,
 * y al terminar el registro completo (`QuizRecordView`). La corrección y el
 * guardado los hace `submitQuiz` (useAssistant); el estado (`open` → `grading`
 * → `done`) vive en la sesión. Queda montado aunque la ventana se cierre
 * (`hidden`), así no se pierden las respuestas. Todo lo del modelo va como texto.
 * @param {Object} props
 * @param {QuizSession} props.session
 * @param {boolean} props.hidden  La ventana está cerrada (no se roba el foco).
 * @param {boolean} props.busy  El Brote está respondiendo otra cosa (no se puede corregir).
 * @param {(given: Record<string, number|boolean|string>) => Promise<QuizOutcome|null>} props.onSubmit
 * @param {() => void} props.onClose  Salir / Cerrar: cierra la ventana sin perder la prueba.
 * @param {() => void} props.onDiscard  Descartar la prueba sin terminarla (sin red; libera los chips de prueba).
 * @param {() => void} props.onRetrySave  Reintentar el guardado del resultado.
 */
export function QuizRunner({ session, hidden, busy, onSubmit, onClose, onDiscard, onRetrySave }) {
  const { questions } = session
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState(/** @type {Record<string, number|boolean|string>} */ ({}))
  const headingRef = useRef(/** @type {HTMLHeadingElement|null} */ (null))
  const submittingRef = useRef(false)
  const phase = session.status === 'open' ? 'answering' : session.status
  /** @type {QuizOutcome|null} */
  const outcome = session.status === 'done' ? /** @type {QuizOutcome} */ (session.outcome) : null
  const given = session.given ?? answers

  // Al cambiar de pregunta, terminar o volver a la prueba, el foco va al título (lo anuncia el lector).
  useEffect(() => {
    if (!hidden) headingRef.current?.focus()
  }, [index, phase, hidden])

  const question = questions[index]
  const total = questions.length
  const pending = questions.filter((q) => !isAnswered(q, given[q.id])).length

  const setAnswer = (id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))

  // Guard de reentrada (doble click en "Terminar"); el hook además ignora un segundo envío.
  const finish = async () => {
    if (submittingRef.current || session.status !== 'open') return
    submittingRef.current = true
    try {
      await onSubmit(answers)
    } finally {
      submittingRef.current = false
    }
  }

  if (phase === 'done' && outcome) {
    const ungraded = outcome.record.questions.filter((q) => q.correct === null).length
    const retry = canRetrySave(session)
    return (
      <>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
          {ungraded > 0 && (
            <p className="text-xs text-text-muted">
              {ungraded === 1 ? 'Una pregunta de desarrollo no se pudo corregir' : `${ungraded} preguntas de desarrollo no se pudieron corregir`} y no cuenta en el puntaje.
            </p>
          )}
          {outcome.gradeError && (
            <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-red-300">
              {outcome.gradeError}
            </p>
          )}
          {outcome.saveError && (
            <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-red-300">
              <span>No se pudo guardar el resultado: {outcome.saveError}</span>
              {retry && (
                <button type="button" onClick={onRetrySave} className={`${BUTTON} ml-auto`}>
                  Reintentar
                </button>
              )}
            </div>
          )}
          {!outcome.saveError && outcome.savedTopics && (
            <p className="text-xs text-text-muted">
              {session.isReview ? 'Actualicé tus temas flojos.' : 'Guardé lo que fallaste para el Repaso de errores.'}
            </p>
          )}
          <QuizRecordView
            title={session.title}
            score={outcome.score}
            questions={outcome.record.questions}
            headingRef={headingRef}
            onNavigate={onClose}
          />
        </div>
        <footer className="flex items-center gap-2 border-t border-border/60 px-5 py-3">
          {outcome.attemptId && (
            <Link to={studyQuizPath(outcome.attemptId)} onClick={onClose} className={BUTTON}>
              Ver en Mi estudio
            </Link>
          )}
          <button type="button" onClick={onClose} className="btn-accent ml-auto px-3 py-1 text-sm">
            Cerrar
          </button>
        </footer>
      </>
    )
  }

  if (!question) return null
  const value = given[question.id]
  const last = index === total - 1
  const grading = phase === 'grading'

  return (
    <>
      <header className="space-y-2 border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <h2 className="truncate font-display text-lg font-bold">{session.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg border border-border px-3 py-1 text-sm text-text-muted transition-colors hover:text-text"
          >
            Salir
          </button>
          {!grading && (
            <button type="button" onClick={onDiscard} className="rounded-lg border border-border px-3 py-1 text-sm text-text-muted transition-colors hover:text-text">
              Descartar prueba
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <h3 id="quiz-progress" ref={headingRef} tabIndex={-1} className="text-sm font-medium">
            Pregunta {index + 1} de {total}
          </h3>
          <span className="text-xs text-text-muted">{TYPE_LABEL[question.type]}</span>
          <div
            role="progressbar"
            aria-labelledby="quiz-progress"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={index + 1}
            className="ml-auto h-1.5 w-32 overflow-hidden rounded-full bg-surface-2"
          >
            <div className="h-full bg-accent transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
      <fieldset disabled={grading} className="space-y-2">
        <legend className="whitespace-pre-wrap break-words font-medium text-text">{question.prompt}</legend>
        {question.type === 'mcq' &&
          (question.options ?? []).map((option, i) => (
            <label key={i} className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-2 hover:border-accent/60">
              <input
                type="radio"
                name={`quiz-${session.key}-${question.id}`}
                checked={value === i}
                onChange={() => setAnswer(question.id, i)}
                className="mt-0.5 accent-accent"
              />
              <span className="whitespace-pre-wrap break-words">{option}</span>
            </label>
          ))}
        {question.type === 'tf' &&
          TF_OPTIONS.map((option) => (
            <label key={option.label} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 hover:border-accent/60">
              <input
                type="radio"
                name={`quiz-${session.key}-${question.id}`}
                checked={value === option.value}
                onChange={() => setAnswer(question.id, option.value)}
                className="accent-accent"
              />
              {option.label}
            </label>
          ))}
        {question.type === 'open' && (
          <>
            <label htmlFor={`quiz-${session.key}-${question.id}`} className="text-xs text-text-muted">
              Tu respuesta
            </label>
            <textarea
              id={`quiz-${session.key}-${question.id}`}
              rows={8}
              value={typeof value === 'string' ? value : ''}
              onChange={(event) => setAnswer(question.id, event.target.value)}
              className="w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
            />
          </>
        )}
      </fieldset>

      <div className="flex items-center gap-2">
        <button type="button" disabled={index === 0 || grading} onClick={() => setIndex((i) => i - 1)} className={BUTTON}>
          Anterior
        </button>
        {last ? (
          <button type="button" disabled={grading || busy} onClick={finish} className="btn-accent ml-auto inline-flex items-center gap-1 px-3 py-1 text-sm disabled:opacity-50">
            <Icon name="check" size={14} />
            {grading ? 'Corrigiendo…' : 'Terminar'}
          </button>
        ) : (
          <button type="button" disabled={grading} onClick={() => setIndex((i) => i + 1)} className={`${BUTTON} ml-auto`}>
            Siguiente
          </button>
        )}
      </div>
      {last && pending > 0 && !grading && (
        <p className="text-xs text-text-muted">
          {pending === 1 ? 'Te queda una pregunta sin responder' : `Te quedan ${pending} preguntas sin responder`}: cuenta como error.
        </p>
      )}
      {busy && !grading && <p className="text-xs text-text-muted">Esperá a que el Brote termine para corregir.</p>}
      {grading && (
        <p role="status" className="text-xs text-text-muted">
          Corrigiendo tus respuestas…
        </p>
      )}
      </div>
    </>
  )
}
