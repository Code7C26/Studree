import { useEffect } from 'react'

/** Cuánto queda visible el aviso. */
const UNDO_TOAST_MS = 6000

/**
 * Aviso flotante "Movido a la papelera · Deshacer" (ver docs/features/trash.md).
 * Se cierra solo a los 6 s. Mismo estilo que el "Deshacer" de las notas del Inicio.
 * @param {Object} props
 * @param {string|null} props.message - null = oculto.
 * @param {() => void} props.onUndo
 * @param {() => void} props.onClose - Pasarlo estable (useCallback): si cambia, el timer se reinicia.
 */
export function UndoToast({ message, onUndo, onClose }) {
  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(onClose, UNDO_TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [message, onClose])

  if (!message) return null

  return (
    <div
      role="status"
      className="glass fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 bg-surface/95 px-4 py-2.5 text-sm text-text shadow-lg shadow-black/40"
    >
      <span>{message}</span>
      <button type="button" onClick={onUndo} className="min-h-8 font-medium text-accent hover:text-accent-soft">
        Deshacer
      </button>
    </div>
  )
}
