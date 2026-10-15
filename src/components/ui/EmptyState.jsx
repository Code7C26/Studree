import { Icon } from './Icon'

/**
 * Estado vacío con ícono, mensaje y acción opcional (Mandamiento UX / Fase 4).
 * @param {Object} props
 * @param {React.ReactNode} [props.icon] - Si no viene, un ícono de hoja (SVG).
 * @param {string} props.title
 * @param {string} [props.message]
 * @param {React.ReactNode} [props.action]
 */
export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
      <span className="text-4xl" aria-hidden="true">
        {icon ?? <Icon name="file-text" size={32} className="text-text-muted" />}
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-text-muted">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
