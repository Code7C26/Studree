import { useEffect, useRef } from 'react'
import { ProposalCard } from './ProposalCard'

/** Período legible del uso que informa el servidor. */
const PERIOD = { day: 'hoy', month: 'este mes' }

/**
 * Conversación con el Brote: mensajes (texto plano), estado, propuestas,
 * avisos y uso. Todo lo del modelo se pinta con `whitespace-pre-wrap`, nunca
 * como HTML.
 * @param {Object} props
 * @param {import('../../../lib/assistant/chatState.js').ChatState} props.state
 * @param {(id: string) => void} props.onAccept
 * @param {(id: string) => void} props.onReject
 */
export function ChatThread({ state, onAccept, onReject }) {
  const endRef = useRef(/** @type {HTMLDivElement|null} */ (null))
  const { messages, proposals, busy, status, error, truncated, usage, quiz } = state

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages, proposals, status, error, quiz])

  return (
    <div role="log" aria-live="polite" aria-label="Conversación con el Brote" className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
      {messages.length === 0 && !error && (
        <p className="text-sm text-text-muted">
          Preguntame algo de tus apuntes, o elegí una acción de arriba. Nunca cambio una hoja sin que lo aceptes.
        </p>
      )}

      {messages.map((message, index) => (
        <p
          key={index}
          className={`whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${
            message.role === 'user' ? 'ml-8 bg-surface-2 text-text' : 'mr-4 bg-surface-lit text-text'
          }`}
        >
          <span className="sr-only">{message.role === 'user' ? 'Vos: ' : 'El Brote: '}</span>
          {message.text}
        </p>
      ))}

      {busy && <p className="text-xs text-text-muted">{status ?? 'Pensando…'}</p>}
      {!busy && truncated && <p className="text-xs text-warn">La respuesta se cortó.</p>}

      {quiz && (
        <div className="rounded-lg border border-border p-3 text-sm">
          <p className="font-medium">La prueba tiene {quiz.length} pregunta{quiz.length === 1 ? '' : 's'}.</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-text-muted">
            {quiz.map((question, index) => (
              <li key={question?.id ?? index} className="whitespace-pre-wrap break-words">
                {typeof question?.prompt === 'string' ? question.prompt : ''}
              </li>
            ))}
          </ol>
        </div>
      )}

      {proposals.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} onAccept={onAccept} onReject={onReject} />
      ))}

      {error && (
        <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {usage && Number.isFinite(usage.used) && Number.isFinite(usage.max) && (
        <p className="text-xs text-text-muted">
          Usaste {usage.used} de {usage.max} {PERIOD[usage.period] ?? ''}.
        </p>
      )}
      <div ref={endRef} />
    </div>
  )
}
