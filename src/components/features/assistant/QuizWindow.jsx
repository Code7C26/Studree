import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Ventana grande del examen. Va en un portal a `document.body` (como `Modal`):
 * adentro del panel el z-30 del Brote la taparía. Cerrada, queda montada con
 * `hidden`: así el examen en curso no pierde las respuestas.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {string} props.title  Nombre accesible de la ventana.
 * @param {() => void} props.onClose  Esc: cierra la ventana sin perder la prueba.
 * @param {React.ReactNode} props.children
 */
export function QuizWindow({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (/** @type {KeyboardEvent} */ event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return createPortal(
    <div
      hidden={!open}
      className={`fixed inset-0 z-50 bg-black/60 sm:items-center sm:justify-center sm:p-6 ${open ? 'flex' : 'hidden'}`}
      // El Esc de la ventana no tiene que cerrar también el panel (que está en el árbol de React).
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation()
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-full w-full flex-col overflow-hidden border-border bg-surface shadow-2xl shadow-black/40 sm:h-[min(90vh,52rem)] sm:max-w-3xl sm:rounded-xl sm:border"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
