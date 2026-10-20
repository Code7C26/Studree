import { proposalTitle } from '../../../lib/assistant/applyProposal.js'

/** Texto del estado de una propuesta que ya no está pendiente. */
const STATUS_TEXT = {
  applied: 'Aplicado en la hoja.',
  rejected: 'Rechazado.',
  failed: 'No se pudo aplicar.',
}

/**
 * Una propuesta de cambio del Brote. Nunca se aplica sola: el usuario elige
 * Aceptar o Rechazar. El texto se muestra plano (nada de HTML del modelo).
 * @param {Object} props
 * @param {import('../../../lib/assistant/chatState.js').Proposal} props.proposal
 * @param {(id: string) => void} props.onAccept
 * @param {(id: string) => void} props.onReject
 */
export function ProposalCard({ proposal, onAccept, onReject }) {
  const pending = proposal.status === 'pending'
  return (
    <article className="rounded-lg border border-accent bg-accent/10 p-3 text-sm" aria-label={proposalTitle(proposal)}>
      <h3 className="font-medium text-accent-soft">{proposalTitle(proposal)}</h3>
      {proposal.source === 'external' && (
        <p className="mt-1 text-xs text-warn">Agregado desde conocimiento externo (lleva la marca en la hoja).</p>
      )}
      <p className="mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap break-words text-text">{proposal.markdown}</p>
      {pending ? (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => onAccept(proposal.id)} className="btn-accent px-3 py-1 text-sm">
            Aceptar
          </button>
          <button
            type="button"
            onClick={() => onReject(proposal.id)}
            className="rounded-lg border border-border px-3 py-1 text-sm text-text-muted transition-colors hover:text-text"
          >
            Rechazar
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-text-muted">{STATUS_TEXT[proposal.status]}</p>
      )}
    </article>
  )
}
