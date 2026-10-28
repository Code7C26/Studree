import { useEffect, useRef, useState } from 'react'
import { useAssistant } from '../../../hooks/useAssistant.js'
import { chatMood } from '../../../lib/assistant/chatState.js'
import { actionLabel, MAX_MESSAGE, lockedActionMessage } from '../../../lib/assistant/requestBuilder.js'
import { QUIZ_ACTIONS, quizOpenReason, blocksNewQuiz, canRetrySave } from '../../../lib/assistant/quizSession.js'
import { Icon } from '../../ui/Icon'
import { Brote } from './Brote'
import { ChatThread } from './ChatThread'
import { QuizRunner } from './QuizRunner'
import { QuizWindow } from './QuizWindow'
import { SummaryWindow } from './SummaryWindow'
import { useLeaveWarning } from '../../../hooks/useLeaveWarning.js'
import { useI18n } from '../../../hooks/useI18n.js'

/** Cuánto dura la alegría del Brote al terminar bien una respuesta. */
const HAPPY_MS = 2500

const CHIPS = ['summary', 'quiz', 'weak_review', 'study_plan', 'gaps', 'connections']

const MODES = [
  { value: 'notes', labelKey: 'assistant.panel.modeNotes' },
  { value: 'external', labelKey: 'assistant.panel.modeExternal' },
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
  const { t } = useI18n()
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
  useLeaveWarning(quizOpen || summaryPending || canRetrySave(quizSession) || summaryDoc?.status === 'error')

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
          {t('assistant.panel.title')}
        </h2>
        {plan === 'premium' && (
          <span className="rounded-full border border-accent/50 px-2 py-0.5 text-[11px] text-accent-soft">{t('assistant.panel.premium')}</span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded p-1 text-text-muted transition-colors hover:text-text"
          aria-label={t('assistant.panel.close')}
        >
          <Icon name="close" />
        </button>
      </header>

      <div className="space-y-2 border-b border-border/60 px-4 py-3">
        <div role="group" aria-label={t('assistant.panel.source')} className="flex gap-1 rounded-lg bg-surface-2 p-1">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={mode === option.value}
              onClick={() => setMode(/** @type {'notes'|'external'} */ (option.value))}
              className={`${SEGMENT} ${mode === option.value ? 'bg-surface-lit text-accent-soft' : 'text-text-muted hover:text-text'}`}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          {t('assistant.panel.scope')}
          <select
            value={scope ?? ''}
            onChange={(event) => setScope(/** @type {any} */ (event.target.value))}
            className="flex-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-text"
          >
            {scope == null && <option value="">{t('assistant.panel.openSubject')}</option>}
            {scopeOptions.map((option) => (
              <option key={option.value} value={option.value} disabled={option.locked}>
                {option.locked ? t('assistant.panel.scopeLocked', { label: option.label }) : option.label}
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
                title={quizBlocked ? quizOpenReason() : undefined}
                aria-describedby={quizBlocked ? 'brote-quiz-open-hint' : undefined}
                onClick={() => runAction(action)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:border-accent/60 hover:text-text disabled:opacity-50"
              >
                {locked ? <Icon name="lock" size={12} /> : <Icon name="sparkles" size={12} />}
                {actionLabel(action)}
                {locked && <span className="text-[10px] text-accent-soft">{t('assistant.panel.premium')}</span>}
              </button>
            )
          })}
        </div>
        {quizOpen && (
          <p id="brote-quiz-open-hint" className="text-xs text-text-muted">
            {quizOpenReason()}
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
          {t('assistant.panel.messageLabel')}
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
          placeholder={t('assistant.panel.placeholder')}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-muted"
        />
        {state.busy ? (
          <button
            type="button"
            onClick={() => {
              stoppedRef.current = true
              stop()
            }}
            aria-label={t('assistant.panel.stop')}
            className="rounded-lg border border-border p-2 text-text-muted transition-colors hover:text-text"
          >
            <Icon name="stop" />
          </button>
        ) : (
          <button type="submit" aria-label={t('assistant.panel.send')} disabled={!draft.trim()} className="btn-accent p-2 disabled:opacity-50">
            <Icon name="send" />
          </button>
        )}
      </form>
    </section>
  )
}
