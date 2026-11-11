/**
 * Botón reutilizable con variantes del design system.
 * @param {Object} props
 * @param {'accent'|'ghost'|'danger'|'cancel'} [props.variant] - Estilo visual. `cancel` (Cancelar, Salir):
 *   borde y texto rojos, para distinguirlo del `danger` sólido de las acciones destructivas.
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export function Button({ variant = 'accent', className = '', children, ...rest }) {
  const variants = {
    accent: 'bg-accent text-bg hover:bg-accent-hover',
    ghost: 'border border-border bg-transparent text-text hover:bg-surface-2',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    cancel: 'border border-red-500/60 bg-transparent text-red-300 hover:bg-red-950/40 hover:text-red-200',
  }

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
