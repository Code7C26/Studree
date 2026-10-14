/**
 * Barra de tabs de las hojas abiertas. Ver docs/features/navigation-shell.md.
 * Solo las hojas ocupan tab (carreras y materias navegan sin abrir una).
 */

/**
 * @param {Object} props
 * @param {Array<{id: string, title: string}>} props.tabs
 * @param {string} [props.activeId]
 * @param {(id: string) => void} props.onActivate
 * @param {(id: string) => void} props.onClose
 */
export function TabBar({ tabs, activeId, onActivate, onClose }) {
  if (tabs.length === 0) return null

  return (
    <div className="flex items-stretch overflow-x-auto border-b border-border bg-surface">
      {tabs.map((tab) => {
        const active = tab.id === activeId
        return (
          <div
            key={tab.id}
            className={`group flex shrink-0 items-center gap-1.5 border-b-2 border-r border-r-border px-3 text-sm transition-colors ${
              active ? 'border-b-accent text-text' : 'border-b-transparent text-text-muted hover:text-text'
            }`}
          >
            <button
              type="button"
              onClick={() => onActivate(tab.id)}
              className="max-w-[160px] truncate py-2"
              title={tab.title}
            >
              {tab.title}
            </button>
            <button
              type="button"
              onClick={() => onClose(tab.id)}
              aria-label={`Cerrar ${tab.title}`}
              className="rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:bg-surface-2 hover:text-text group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
