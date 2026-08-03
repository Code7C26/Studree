/**
 * Campo de texto con label asociado (accesible).
 * @param {Object} props
 * @param {string} props.id
 * @param {string} props.label
 * @param {string} [props.className]
 */
export function TextField({ id, label, className = '', ...rest }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm text-text-muted">
        {label}
      </label>
      <input
        id={id}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none transition-colors focus:border-accent"
        {...rest}
      />
    </div>
  )
}
