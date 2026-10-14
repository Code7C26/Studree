/**
 * Fila del explorador: chevron (si tiene hijos), ícono de nivel, nombre,
 * resaltado si es el nodo activo, y edición inline del nombre. Ver
 * docs/features/navigation-shell.md.
 */

import { useState } from 'react'

const CHEVRON_WIDTH = 18

/**
 * @param {Object} props
 * @param {string} props.icon - Emoji del nivel (Carrera/Materia/Hoja).
 * @param {string} props.label
 * @param {number} props.depth - 0 = Carrera, 1 = Materia, etc. Define la indentación.
 * @param {boolean} [props.hasChildren]
 * @param {boolean} [props.expanded]
 * @param {() => void} [props.onToggle]
 * @param {boolean} [props.active]
 * @param {() => void} props.onSelect
 * @param {(name: string) => Promise<string|null>|void} [props.onRename] - Si falta, no se muestra
 *   el lápiz. Si devuelve un mensaje de error (ej. título repetido), se muestra debajo.
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
  onRename,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)
  const [renameError, setRenameError] = useState(null)

  /** @param {React.MouseEvent} event */
  function startEditing(event) {
    event.stopPropagation()
    setDraft(label)
    setRenameError(null)
    setEditing(true)
  }

  async function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (!trimmed || trimmed === label) return
    const failure = await onRename(trimmed)
    setRenameError(typeof failure === 'string' ? failure : null)
  }

  /** @param {React.KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setEditing(false)
    }
  }

  return (
    <>
      <div
        className={`group flex items-center gap-1 rounded-md text-sm transition-colors ${
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

        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Renombrar ${label}`}
            className="min-w-0 flex-1 rounded border border-accent bg-bg px-1.5 py-0.5 text-sm text-text outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-2 text-left"
          >
            <span aria-hidden="true">{icon}</span>
            <span className="truncate">{label}</span>
          </button>
        )}

        {onRename && !editing && (
          <button
            type="button"
            onClick={startEditing}
            aria-label={`Renombrar ${label}`}
            className="shrink-0 p-1 text-text-muted opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
          >
            ✏️
          </button>
        )}
      </div>
      {renameError && (
        <p role="alert" className="px-2 pb-1 text-[11px] text-red-400" style={{ paddingLeft: depth * 14 + CHEVRON_WIDTH }}>
          {renameError}
        </p>
      )}
    </>
  )
}
