import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Modal genérico: overlay oscuro + panel centrado. Cierra con Escape o click afuera.
 * Se renderiza con un portal en `document.body`: el `<main>` del workspace es
 * `isolate` (contexto de apilamiento) y adentro su z-50 no taparía al Brote.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} [props.title]
 * @param {React.ReactNode} props.children
 */
export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-surface p-6 shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-xl sm:pb-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && <h2 className="mb-4 text-lg font-semibold">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  )
}
