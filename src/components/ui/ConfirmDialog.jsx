import { Modal } from './Modal'
import { Button } from './Button'

/**
 * Diálogo de confirmación para acciones destructivas (Mandamiento UX / Fase 4).
 * @param {Object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {string} props.message
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 * @param {string} [props.confirmLabel]
 */
export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Eliminar',
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
