import { useEffect, useRef, useState } from 'react'
import { MAX_MESSAGE } from '../../../lib/assistant/requestBuilder.js'
import { Icon } from '../../ui/Icon'

/** Botón secundario de la tarjeta (Descartar, Seguir en el chat, Responder). */
const SECONDARY =
  'rounded-lg border border-border px-3 py-1 text-sm text-text-muted transition-colors hover:text-text disabled:opacity-50'

/**
 * Último texto del Brote (lo que se anuncia al terminar).
 * @param {import('../../../lib/assistant/chatState.js').Message[]} replies
 * @returns {string}
 */
function lastReplyText(replies) {
  for (let i = replies.length - 1; i >= 0; i--) {
    if (replies[i].role === 'assistant') return replies[i].text
  }
  return ''
}

/**
 * Tarjeta de la respuesta de un atajo, dentro de la hoja (Fase 14.1, spec § 3):
 * la carpeta la dibuja por portal en el widget del ancla (`broteAnchor.js`),
 * debajo del bloque donde terminó la selección. Todo lo del modelo se pinta
 * como texto plano (`whitespace-pre-wrap`), nunca como HTML. Nunca agrega nada
 * a la hoja sin que el usuario toque "Agregar a la hoja".
 * Ver docs/features/folder.md y docs/features/assistant.md.
 * @param {Object} props
 * @param {import('../../../lib/assistant/inlineAnswer.js').InlineView} props.view
 * @param {() => void} props.onClose  ✕ y Esc.
 * @param {(proposalId: string) => void} props.onAccept  "Agregar a la hoja".
 * @param {() => void} props.onDiscard
 * @param {() => void} props.onContinue  "Seguir en el chat".
 * @param {(text: string) => void} props.onAnswer  Respuesta del Preguntame.
 * @param {() => void} [props.onEscape]  Después de Esc: devuelve el foco al editor.
 */
export function InlineAnswerCard({ view, onClose, onAccept, onDiscard, onContinue, onAnswer, onEscape }) {
  const { label, replies, busy, status, error, notice, proposal, external, canAnswer } = view
  const [draft, setDraft] = useState('')
  // Lectores de pantalla: se anuncia la respuesta al terminar, no letra por letra.
  const [announcement, setAnnouncement] = useState('')
  const wasBusyRef = useRef(busy)

  useEffect(() => {
    if (wasBusyRef.current && !busy) setAnnouncement(lastReplyText(replies))
    wasBusyRef.current = busy
  }, [busy, replies])

  const submitAnswer = () => {
    if (!canAnswer || !draft.trim()) return
    onAnswer(draft)
    setDraft('')
  }

  return (
    <div
      role="region"
      aria-label="Respuesta del Brote"
      aria-busy={busy}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.nativeEvent.isComposing) return
        // Que no llegue a los atajos globales (p. ej. salir del modo lectura).
        event.preventDefault()
        event.stopPropagation()
        onClose()
        onEscape?.()
      }}
      className="my-3 w-full max-w-md cursor-default whitespace-normal rounded-xl border border-border bg-surface p-3 text-sm text-text shadow-xl shadow-black/30"
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon name="sparkles" size={14} className="shrink-0 text-accent-soft" />
        <span className="font-semibold text-accent-soft">Brote · {label}</span>
        {external && (
          <span className="rounded-full border border-warn/40 px-2 py-0.5 text-xs text-warn">Con conocimiento externo</span>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar la respuesta del Brote"
          className="ml-auto rounded p-1 text-text-muted transition-colors hover:text-text"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <div className="space-y-2">
        {replies.map((message, index) =>
          message.role === 'user' ? (
            <div key={index} className="ml-6 whitespace-pre-wrap break-words rounded-lg bg-surface-2 px-2.5 py-1.5">
              <span className="sr-only">Vos: </span>
              {message.text}
            </div>
          ) : (
            <div key={index} className="whitespace-pre-wrap break-words leading-relaxed">
              {message.text}
            </div>
          ),
        )}

        {busy && <div className="text-xs text-text-muted">{status ?? 'Pensando…'}</div>}

        {notice && (
          <div role="status" className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-text-muted">
            {notice}
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-2.5 py-1.5 text-red-300">
            {error}
          </div>
        )}

        {proposal && (
          <div className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words rounded-md border-l-2 border-accent bg-accent/10 px-2.5 py-1.5">
            <span className="sr-only">Texto propuesto para la hoja: </span>
            {proposal.markdown}
          </div>
        )}
      </div>

      {canAnswer && (
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            submitAnswer()
          }}
        >
          <label className="flex flex-1 flex-col gap-1 text-xs text-text-muted">
            Tu respuesta
            <textarea
              rows={2}
              maxLength={MAX_MESSAGE}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  submitAnswer()
                }
              }}
              className="max-h-32 min-h-10 resize-none rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-text"
            />
          </label>
          <button type="submit" disabled={!draft.trim()} className="btn-accent px-3 py-1 text-sm disabled:opacity-50">
            Responder
          </button>
        </form>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {proposal && (
          <>
            <button type="button" onClick={() => onAccept(proposal.id)} className="btn-accent px-3 py-1 text-sm">
              Agregar a la hoja
            </button>
            <button type="button" onClick={onDiscard} className={SECONDARY}>
              Descartar
            </button>
          </>
        )}
        <button type="button" onClick={onContinue} disabled={busy} className={SECONDARY}>
          Seguir en el chat
        </button>
      </div>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}
