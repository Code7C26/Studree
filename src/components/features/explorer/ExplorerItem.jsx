/**
 * Fila del explorador: chevron (si tiene hijos), ícono de nivel, nombre y
 * resaltado si es el nodo activo. Ver docs/features/navigation-shell.md.
 */

const CHEVRON_WIDTH = 18

/**
 * @param {Object} props
 * @param {string} props.icon - Emoji del nivel (Carrera/Materia/Unidad/Tema/Hoja).
 * @param {string} props.label
 * @param {number} props.depth - 0 = Carrera, 1 = Materia, etc. Define la indentación.
 * @param {boolean} [props.hasChildren]
 * @param {boolean} [props.expanded]
 * @param {() => void} [props.onToggle]
 * @param {boolean} [props.active]
 * @param {() => void} props.onSelect
 */
export function ExplorerItem({
  icon,
  label,
  depth,
  hasChildren = false,
  expanded = false,
  onToggle,
  active = false,
  onSelect,
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-md text-sm transition-colors ${
        active ? 'bg-accent/15 text-accent' : 'text-text hover:bg-surface-2'
      }`}
      style={{ paddingLeft: depth * 14 }}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? `Colapsar ${label}` : `Expandir ${label}`}
          className="flex shrink-0 items-center justify-center py-1.5 text-text-muted hover:text-text"
          style={{ width: CHEVRON_WIDTH }}
        >
          {expanded ? '▾' : '▸'}
        </button>
      ) : (
        <span className="shrink-0" style={{ width: CHEVRON_WIDTH }} aria-hidden="true" />
      )}

      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-2 text-left"
      >
        <span aria-hidden="true">{icon}</span>
        <span className="truncate">{label}</span>
      </button>
    </div>
  )
}
