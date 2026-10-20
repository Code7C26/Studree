import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../ui/Icon'
import { subjectFolderPath } from '../../../constants/routes'
import { formatSheetDateLong } from '../../../lib/format/sheetDate.js'

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

/** Texto legible de una respuesta (dada o correcta). */
function answerText(question, value) {
  if (value === undefined || value === null || value === '') return 'Sin responder'
  if (question.type === 'mcq') return question.options?.[/** @type {number} */ (value)] ?? 'Sin responder'
  if (question.type === 'tf') return value === true ? 'Verdadero' : 'Falso'
  return String(value)
}

/**
 * Una prueba tipo examen del Brote: una pregunta por vez (radios para opción
 * múltiple y verdadero/falso, textarea con etiqueta para desarrollo), progreso
 * "Pregunta 3 de 10", y al terminar el puntaje y cada error con su
 * explicación y la hoja de origen. La corrección y el guardado los hace
 * `submitQuiz` (useAssistant); acá solo se pinta. Todo lo del modelo va como
 * texto plano.
 * @param {Object} props
 * @param {QuizSession} props.session
 * @param {boolean} props.busy  El Brote está respondiendo otra cosa (no se puede corregir).
 * @param {(given: Record<string, number|boolean|string>) => Promise<QuizOutcome|null>} props.onSubmit
 * @param {() => void} props.onClose  Volver al chat.
 */
export function QuizRunner({ session, busy, onSubmit, onClose }) {
  const { questions } = session
  const [index, setIndex] = useState(0)
  const [given, setGiven] = useState(/** @type {Record<string, number|boolean|string>} */ ({}))
  const [phase, setPhase] = useState(/** @type {'answering'|'grading'|'done'} */ ('answering'))
  const [outcome, setOutcome] = useState(/** @type {QuizOutcome|null} */ (null))
  const headingRef = useRef(/** @type {HTMLHeadingElement|null} */ (null))
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Al cambiar de pregunta o terminar, el foco va al título (lo anuncia el lector).
  useEffect(() => {
    headingRef.current?.focus()
  }, [index, phase])

  const question = questions[index]
  const total = questions.length
  const pending = questions.filter((q) => !isAnswered(q, given[q.id])).length

  const setAnswer = (id, value) => setGiven((prev) => ({ ...prev, [id]: value }))

  const finish = async () => {
    setPhase('grading')
    const result = await onSubmit(given)
    if (!mounted.current) return
    setOutcome(result)
    setPhase(result ? 'done' : 'answering')
  }

  if (phase === 'done' && outcome) {
    const byId = new Map(outcome.results.map((r) => [r.id, r]))
    const wrong = questions.filter((q) => byId.get(q.id)?.correct === false)
    const ungraded = questions.filter((q) => byId.get(q.id)?.correct === null)
    return (
      <section aria-labelledby="quiz-result-title" className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        <h3 id="quiz-result-title" ref={headingRef} tabIndex={-1} className="font-display text-lg font-bold">
          Sacaste {outcome.score.correct} de {outcome.score.total}
        </h3>
        {ungraded.length > 0 && (
          <p className="text-xs text-text-muted">
            {ungraded.length === 1 ? 'Una pregunta de desarrollo no se pudo corregir' : `${ungraded.length} preguntas de desarrollo no se pudieron corregir`} y no cuenta en el puntaje.
          </p>
        )}
        {outcome.gradeError && (
          <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-red-300">
            {outcome.gradeError}
          </p>
        )}
        {outcome.saveError && (
          <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-red-300">
            No se pudo guardar el resultado: {outcome.saveError}
          </p>
        )}
        {!outcome.saveError && outcome.savedTopics && (
          <p className="text-xs text-text-muted">
            {session.isReview ? 'Actualicé tus temas flojos.' : 'Guardé lo que fallaste para el Repaso de errores.'}
          </p>
        )}

        {wrong.length === 0 ? (
          <p className="text-text-muted">No tuviste errores.</p>
        ) : (
          <ol className="space-y-3">
            {wrong.map((q) => {
              const sheet = q.sheetId ? outcome.sheets[q.sheetId] : null
              const feedback = byId.get(q.id)?.feedback
              return (
                <li key={q.id} className="rounded-lg border border-border p-3">
                  <p className="flex items-start gap-1.5 font-medium">
                    <Icon name="close" size={14} className="mt-0.5 text-red-300" />
                    <span className="sr-only">Incorrecta: </span>
                    <span className="whitespace-pre-wrap break-words">{q.prompt}</span>
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-text-muted">
                    Tu respuesta: {answerText(q, given[q.id])}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words">
                    {q.type === 'open' ? 'Respuesta de referencia' : 'Respuesta correcta'}: {answerText(q, q.answer)}
                  </p>
                  {feedback && <p className="mt-2 whitespace-pre-wrap break-words text-text-muted">{feedback}</p>}
                  <p className="mt-2 whitespace-pre-wrap break-words text-text-muted">{q.explanation}</p>
                  {sheet && (
                    <Link
                      to={subjectFolderPath(sheet.subject_id, /** @type {string} */ (q.sheetId))}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-accent-soft hover:underline"
                    >
                      <Icon name="file-text" size={12} />
                      Hoja del {formatSheetDateLong(sheet.created_at)}
                    </Link>
                  )}
                </li>
              )
            })}
          </ol>
        )}
        <button type="button" onClick={onClose} className={BUTTON}>
          Volver al chat
        </button>
      </section>
    )
  }

  if (!question) return null
  const value = given[question.id]
  const last = index === total - 1
  const grading = phase === 'grading'

  return (
    <section aria-labelledby="quiz-progress" className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <h3 id="quiz-progress" ref={headingRef} tabIndex={-1} className="font-display text-base font-bold">
          Pregunta {index + 1} de {total}
        </h3>
        <span className="text-xs text-text-muted">{TYPE_LABEL[question.type]}</span>
        <button type="button" onClick={onClose} className="ml-auto text-xs text-text-muted transition-colors hover:text-text">
          Volver al chat
        </button>
      </div>

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
              rows={5}
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
    </section>
  )
}
