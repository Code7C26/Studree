import { useEffect, useRef } from 'react'
import { threadItems } from '../../../lib/assistant/chatState.js'
import { ProposalCard } from './ProposalCard'
import { useI18n } from '../../../hooks/useI18n.js'

/**
 * Conversación con el Brote: mensajes (texto plano), estado, propuestas,
 * avisos y uso. Todo lo del modelo se pinta con `whitespace-pre-wrap`, nunca
 * como HTML.
 * @param {Object} props
 * @param {import('../../../lib/assistant/chatState.js').ChatState} props.state
 * @param {(id: string) => void} props.onAccept
 * @param {(id: string) => void} props.onReject
 * @param {{done: boolean, correct: number, total: number}|null} [props.quiz]  La prueba de la sesión (abierta, corrigiéndose o terminada).
 * @param {() => void} [props.onOpenQuiz]  Abre la ventana del examen.
 * @param {() => void} [props.onOpenSummary]  Abre la ventana del resumen.
 */
export function ChatThread({ state, onAccept, onReject, quiz: quizLine, onOpenQuiz, onOpenSummary }) {
  const { t } = useI18n()
  const endRef = useRef(/** @type {HTMLDivElement|null} */ (null))
  const { messages, proposals, busy, status, error, notice, truncated, usage, quiz, summary } = state

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages, proposals, status, error, notice, quiz, summary])

  return (
    <div role="log" aria-live="polite" aria-busy={busy} aria-label={t('assistant.chat.log')} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
      {messages.length === 0 && !error && !notice && (
        <p className="text-sm text-text-muted">
          {t('assistant.chat.empty')}
        </p>
      )}

      {threadItems(state).map((item, index) => {
        if (item.type === 'proposal') {
          return <ProposalCard key={item.proposal.id} proposal={item.proposal} onAccept={onAccept} onReject={onReject} />
        }
        const { message } = item
        return (
          <p
            key={index}
            className={`whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${
              message.role === 'user' ? 'ml-8 bg-surface-2 text-text' : 'mr-4 bg-surface-lit text-text'
            }`}
          >
            <span className="sr-only">{message.role === 'user' ? t('assistant.chat.you') : t('assistant.chat.brote')}</span>
            {message.text}
          </p>
        )
      })}

      {busy && <p className="text-xs text-text-muted">{status ?? t('assistant.chat.thinking')}</p>}
      {!busy && truncated && <p className="text-xs text-warn">{t('assistant.chat.truncated')}</p>}

      {quizLine && onOpenQuiz && (
        <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
          <p className="font-medium">
            {quizLine.done ? t('assistant.chat.quizDone', { correct: quizLine.correct, total: quizLine.total }) : t('assistant.chat.quizOpen')}
          </p>
          <button type="button" onClick={onOpenQuiz} className="btn-accent ml-auto px-3 py-1 text-sm">
            {quizLine.done ? t('assistant.chat.quizSeeResult') : t('assistant.chat.quizContinue')}
          </button>
        </div>
      )}

      {summary && onOpenSummary && (
        <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
          <p className="min-w-0 break-words font-medium">{t('assistant.chat.summaryReady', { title: summary.title })}</p>
          <button type="button" onClick={onOpenSummary} className="btn-accent ml-auto shrink-0 px-3 py-1 text-sm">
            {t('assistant.chat.open')}
          </button>
        </div>
      )}

      {notice && (
        <p role="status" className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-muted">
          {notice}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {usage && Number.isFinite(usage.used) && Number.isFinite(usage.max) && (
        <p className="text-xs text-text-muted">
          {t('assistant.chat.usage', {
            used: usage.used,
            max: usage.max,
            period: usage.period === 'day' || usage.period === 'month' ? t(`assistant.chat.period.${usage.period}`) : '',
          })}
        </p>
      )}
      <div ref={endRef} />
    </div>
  )
}
