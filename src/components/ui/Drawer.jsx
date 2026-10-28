import { useEffect } from 'react'
import { Icon } from './Icon'
import { useI18n } from '../../hooks/useI18n.js'

/**
 * Panel lateral deslizante (drawer) desde la derecha, con overlay.
 * Se mantiene montado para animar la entrada/salida (controlado por `open`).
 * Cerrado queda `inert`: fuera de la pantalla no tiene que recibir foco con Tab.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} [props.title]
 * @param {React.ReactNode} props.children
 */
export function Drawer({ open, onClose, title, children }) {
  const { t } = useI18n()
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        role="presentation"
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={open ? undefined : true}
        inert={open ? undefined : ''}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="truncate text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-muted transition-colors hover:text-text"
            aria-label={t('shell.drawer.close')}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </>
  )
}
