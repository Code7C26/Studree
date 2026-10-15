/**
 * Contenedor común de los bloques del Inicio: título, acción opcional y aviso
 * de error del bloque. Ver docs/features/home.md.
 * @param {Object} props
 * @param {string} props.title
 * @param {React.ReactNode} [props.action]
 * @param {string|null} [props.error]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export function HomePanel({ title, action, error, className = '', children }) {
  return (
    <section className={`card ${className}`} aria-label={title}>
      <div className="mb-3 flex min-h-8 items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">{title}</h2>
        {action}
      </div>
      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {children}
    </section>
  )
}
