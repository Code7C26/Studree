/**
 * Fila de pastillas de las materias abiertas (ADR-017, ADR-018) + botón del
 * explorador. Ver docs/features/navigation-shell.md.
 */

import { Icon } from '../ui/Icon'
import { getSubjectTones } from '../../constants/subjectTones.js'

/**
 * @param {Object} props
 * @param {Array<{id: string, title: string, color?: string|null}>} props.tabs
 * @param {string} [props.activeId]
 * @param {(id: string) => void} props.onActivate
 * @param {(id: string) => void} props.onClose
 * @param {boolean} props.explorerOpen
 * @param {() => void} props.onToggleExplorer
 */
export function TabBar({ tabs, activeId, onActivate, onClose, explorerOpen, onToggleExplorer }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/60 px-2 py-1.5">
      <button
        type="button"
        onClick={onToggleExplorer}
        aria-label={explorerOpen ? 'Ocultar explorador (Ctrl+B)' : 'Mostrar explorador (Ctrl+B)'}
        aria-pressed={explorerOpen}
        title="Explorador (Ctrl+B)"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        <Icon name="sidebar" />
      </button>
      {tabs.map((tab) => {
        const active = tab.id === activeId
        const tones = getSubjectTones(tab.color)
        return (
          <div
            key={tab.id}
            className={`group flex shrink-0 items-center gap-1 rounded-lg border pl-2.5 pr-1 text-sm transition-colors ${
              active ? 'text-text' : 'border-transparent text-text-muted hover:bg-surface-2 hover:text-text'
            }`}
            style={active ? { backgroundColor: tones.soft, borderColor: tones.base } : undefined}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tones.base }} aria-hidden="true" />
            <button
              type="button"
              onClick={() => onActivate(tab.id)}
              className="max-w-[160px] truncate py-1"
              title={tab.title}
              aria-current={active ? 'page' : undefined}
            >
              {tab.title}
            </button>
            <button
              type="button"
              onClick={() => onClose(tab.id)}
              aria-label={`Cerrar ${tab.title}`}
              className={`rounded p-1 text-text-muted transition-opacity hover:bg-surface-2 hover:text-text focus-visible:opacity-100 ${
                active ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100'
              }`}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
