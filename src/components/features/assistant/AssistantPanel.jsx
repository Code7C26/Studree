import { useEffect, useRef, useState } from 'react'
import { useAssistant } from '../../../hooks/useAssistant.js'
import { chatMood } from '../../../lib/assistant/chatState.js'
import { ACTION_LABELS, MAX_MESSAGE, lockedActionMessage } from '../../../lib/assistant/requestBuilder.js'
import { QUIZ_ACTIONS, QUIZ_OPEN_REASON, blocksNewQuiz } from '../../../lib/assistant/quizSession.js'
import { Icon } from '../../ui/Icon'
import { Brote } from './Brote'
import { ChatThread } from './ChatThread'
import { QuizRunner } from './QuizRunner'
import { QuizWindow } from './QuizWindow'
import { SummaryWindow } from './SummaryWindow'
import { useLeaveWarning } from '../../../hooks/useLeaveWarning.js'

/** Cuánto dura la alegría del Brote al terminar bien una respuesta. */
const HAPPY_MS = 2500

const CHIPS = ['summary', 'quiz', 'weak_review', 'study_plan', 'gaps', 'connections']

const MODES = [
  { value: 'notes', label: 'Mis apuntes' },
  { value: 'external', label: 'Con conocimiento externo' },
]

const SEGMENT = 'flex-1 rounded-md px-2 py-1 text-xs transition-colors'

/**
 * Línea de la prueba en el chat: abierta o corrigiéndose ("Seguir") o terminada ("Ver resultado").
 * @param {import('../../../hooks/useAssistant.js').QuizSession} session
 * @returns {{done: boolean, correct: number, total: number}}
 */
function quizLine(session) {
  const score = session.outcome?.score
  return { done: session.status === 'done', correct: score?.correct ?? 0, total: score?.total ?? session.questions.length }
}

/**
 * Panel del Brote (se carga con React.lazy desde AssistantHost). Queda montado
 * aunque se cierre, así la conversación sigue mientras dure la sesión.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {number} props.focusSignal  Cambia cada vez que el usuario abre el panel: recién ahí se enfoca la entrada (no al cargar la página).
 * @param {() => void} props.onClose
 * @param {(mood: import('./Brote').BroteState) => void} props.onMood
 */
export function AssistantPanel({ open, focusSignal, onClose, onMood }) {
  const {
    state, plan, mode, setMode, scope, setScope, scopeOptions, send, runAction, stop, acceptProposal, rejectProposal,
    quizSession, submitQuiz, discardOpenQuiz, retryQuizSave, inlineBusy, summaryDoc, retrySummarySave, summaryPending,
  } = useAssistant()
  // Con una prueba sin terminar no se puede pedir otra: la reemplazaría (respuestas perdidas y cupo gastado).
  const quizOpen = blocksNewQuiz(quizSession)
  // La prueba se abre sola en su ventana apenas llega; "Salir" la esconde sin perderla.
  const [quizVisible, setQuizVisible] = useState(false)
  const [shownQuizKey, setShownQuizKey] = useState(0)
  if (quizSession && quizSession.key !== shownQuizKey) {
    setShownQuizKey(quizSession.key)
    setQuizVisible(true)
  }
  // El resumen también se abre solo en su ventana al llegar uno nuevo (`key`).
  const [summaryVisible, setSummaryVisible] = useState(false)
  const [shownSummaryKey, setShownSummaryKey] = useState(0)
  if (summaryDoc && summaryDoc.key !== shownSummaryKey) {
    setShownSummaryKey(summaryDoc.key)
    setSummaryVisible(true)
  }
  const [draft, setDraft] = useState('')
  const [happy, setHappy] = useState(false)
  const inputRef = useRef(/** @type {HTMLTextAreaElement|null} */ (null))
  const wasBusy = useRef(false)
  const stoppedRef = useRef(false)

  // Solo cuando el usuario lo abre (si se recordó abierto, no se roba el foco al cargar).
  useEffect(() => {
    if (focusSignal > 0) inputRef.current?.focus()
  }, [focusSignal])

  // Al terminar bien una respuesta, el Brote se alegra un rato (no si el usuario la cortó).
  useEffect(() => {
    const was = wasBusy.current
    wasBusy.current = state.busy
    if (state.busy && !was) stoppedRef.current = false
    if (!was || state.busy || state.error) return undefined
    if (stoppedRef.current) {
      stoppedRef.current = false
      return undefined
    }
    setHappy(true)
    const timer = window.setTimeout(() => setHappy(false), HAPPY_MS)
    return () => {
      window.clearTimeout(timer)
      setHappy(false)
    }
  }, [state.busy, state.error])

  const showQuiz = Boolean(quizSession && quizVisible)
  // Una prueba sin terminar no se guarda a medias: cerrar o recargar la pestaña pregunta antes.
  // Ni un resumen que todavía se está armando o guardando.
  useLeaveWarning(quizOpen || summaryPending)

  const base = chatMood(state)
  const mood = happy && base === 'idle' ? 'happy' : base
  useEffect(() => {
    onMood(mood)
  }, [mood, onMood])

  // El borrador solo se borra si el pedido salió (sin alcance, p. ej. free en Inicio, se conserva).
  const submit = () => {
    if (state.busy || !draft.trim()) return
    if (send(draft)) setDraft('')
  }

  return (
    <section
      id="brote-panel"
      role="dialog"
      aria-labelledby="brote-panel-title"
      hidden={!open}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onClose()
        }
      }}
      className={`glass fixed inset-0 z-30 flex-col rounded-none bg-surface/95 shadow-2xl shadow-black/40 sm:inset-auto sm:bottom-24 sm:right-6 sm:top-16 sm:w-96 sm:rounded-xl ${
        open ? 'flex' : 'hidden'
      }`}
    >
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Brote state={mood} size={32} />
        <h2 id="brote-panel-title" className="font-display text-lg font-bold">
          El Brote
        </h2>
        {plan === 'premium' && (
          <span className="rounded-full border border-accent/50 px-2 py-0.5 text-[11px] text-accent-soft">Premium</span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded p-1 text-text-muted transition-colors hover:text-text"
          aria-label="Cerrar el Brote"
        >
          <Icon name="close" />
        </button>
      </header>

      <div className="space-y-2 border-b border-border/60 px-4 py-3">
        <div role="group" aria-label="Fuente de las respuestas" className="flex gap-1 rounded-lg bg-surface-2 p-1">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={mode === option.value}
              onClick={() => setMode(/** @type {'notes'|'external'} */ (option.value))}
              className={`${SEGMENT} ${mode === option.value ? 'bg-surface-lit text-accent-soft' : 'text-text-muted hover:text-text'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          Alcance
          <select
            value={scope ?? ''}
            onChange={(event) => setScope(/** @type {any} */ (event.target.value))}
            className="flex-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-text"
          >
            {scope == null && <option value="">Abrí una materia</option>}
            {scopeOptions.map((option) => (
              <option key={option.value} value={option.value} disabled={option.locked}>
                {option.locked ? `${option.label} (Premium)` : option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map((action) => {
            const locked = lockedActionMessage(action, plan) != null
            const quizBlocked = quizOpen && QUIZ_ACTIONS.includes(action)
            return (
              <button
                key={action}
                type="button"
                disabled={state.busy || quizBlocked}
                title={quizBlocked ? QUIZ_OPEN_REASON : undefined}
                aria-describedby={quizBlocked ? 'brote-quiz-open-hint' : undefined}
                onClick={() => runAction(action)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:border-accent/60 hover:text-text disabled:opacity-50"
              >
                {locked ? <Icon name="lock" size={12} /> : <Icon name="sparkles" size={12} />}
                {ACTION_LABELS[action]}
                {locked && <span className="text-[10px] text-accent-soft">Premium</span>}
              </button>
            )
          })}
        </div>
        {quizOpen && (
          <p id="brote-quiz-open-hint" className="text-xs text-text-muted">
            {QUIZ_OPEN_REASON}
          </p>
        )}
      </div>

      <ChatThread
        state={state}
        onAccept={acceptProposal}
        onReject={rejectProposal}
        quiz={quizSession ? quizLine(quizSession) : null}
        onOpenQuiz={quizSession ? () => setQuizVisible(true) : undefined}
        onOpenSummary={summaryDoc ? () => setSummaryVisible(true) : undefined}
      />

      {summaryDoc && (
        <SummaryWindow key={summaryDoc.key} summaryDoc={summaryDoc} open={summaryVisible} onClose={() => setSummaryVisible(false)} onRetry={retrySummarySave} />
      )}

      {/* La prueba no se desmonta al cerrar la ventana: se oculta y conserva respuestas y resultado. */}
      {quizSession && (
        <QuizWindow open={showQuiz} title={quizSession.title} onClose={() => setQuizVisible(false)}>
          <QuizRunner
            key={quizSession.key}
            session={quizSession}
            hidden={!showQuiz}
            busy={state.busy || inlineBusy}
            onSubmit={submitQuiz}
            onClose={() => setQuizVisible(false)}
            onDiscard={discardOpenQuiz}
            onRetrySave={retryQuizSave}
          />
        </QuizWindow>
      )}

      <form
        className="flex items-end gap-2 border-t border-border/60 px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <label htmlFor="brote-input" className="sr-only">
          Mensaje para el Brote
        </label>
        <textarea
          id="brote-input"
          ref={inputRef}
          rows={2}
          maxLength={MAX_MESSAGE}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              submit()
            }
          }}
          placeholder="Preguntale algo a tus apuntes…"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-muted"
        />
        {state.busy ? (
          <button
            type="button"
            onClick={() => {
              stoppedRef.current = true
              stop()
            }}
            aria-label="Detener la respuesta"
            className="rounded-lg border border-border p-2 text-text-muted transition-colors hover:text-text"
          >
            <Icon name="stop" />
          </button>
        ) : (
          <button type="submit" aria-label="Enviar" disabled={!draft.trim()} className="btn-accent p-2 disabled:opacity-50">
            <Icon name="send" />
          </button>
        )}
      </form>
    </section>
  )
}
