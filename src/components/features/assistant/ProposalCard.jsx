import { proposalTitle } from '../../../lib/assistant/applyProposal.js'
import { formatSheetDay } from '../../../lib/format/sheetDate.js'
import { Icon } from '../../ui/Icon'

/** Texto del estado de una propuesta que falló (sigue a la vista completa). */
const FAILED_TEXT = 'No se pudo aplicar.'

/** Línea de una propuesta aplicada: dónde quedó. */
function appliedText(proposal) {
  if (proposal.kind === 'new_sheet') return 'Agregado a una hoja nueva'
  return proposal.appliedSheetCreatedAt
    ? `Agregado a tu hoja del ${formatSheetDay(proposal.appliedSheetCreatedAt)}`
    : 'Agregado a tu hoja'
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
  // Resuelta: una sola línea, sin el texto propuesto.
  if (proposal.status === 'applied') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-text-muted">
        <Icon name="check" size={14} className="text-accent-soft" />
        {appliedText(proposal)}
      </p>
    )
  }
  if (proposal.status === 'rejected') return <p className="text-xs text-text-muted">Descartado</p>
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
        <p className="mt-2 text-xs text-text-muted">{FAILED_TEXT}</p>
      )}
    </article>
  )
}
