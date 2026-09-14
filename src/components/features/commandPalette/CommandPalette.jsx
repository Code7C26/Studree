/**
 * Overlay `Ctrl+K`: busca hojas (objetivo principal), materias, unidades y
 * temas por nombre, con matching de subsecuencia (fuzzy) hecho a mano.
 * Ver docs/features/navigation-shell.md.
 */

import { useEffect, useMemo, useState } from 'react'

const ICONS = { subject: '📚', unit: '📁', topic: '🔖', sheet: '📝' }

/** @param {string} text @param {string} query */
function fuzzyMatch(text, query) {
  if (!query) return true
  let cursor = 0
  for (const char of query) {
    cursor = text.indexOf(char, cursor)
    if (cursor === -1) return false
    cursor += 1
  }
  return true
}

/** Menor es mejor: exacto < empieza con < contiene < subsecuencia suelta. */
function score(text, query) {
  if (text === query) return 0
  if (text.startsWith(query)) return 1
  if (text.includes(query)) return 2
  return 3
}

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {import('../../../hooks/useExplorerTree.js').SearchEntry[]} props.searchIndex
 * @param {(subjectId: string) => void} props.onNavigateSubject
 * @param {(sheet: {id: string, title: string}) => void} props.onOpenSheet
 */
export function CommandPalette({ open, onClose, searchIndex, onNavigateSubject, onOpenSheet }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return searchIndex
      .filter((entry) => fuzzyMatch(entry.name.toLowerCase(), q))
      .sort((a, b) => score(a.name.toLowerCase(), q) - score(b.name.toLowerCase(), q))
      .slice(0, 30)
  }, [searchIndex, query])

  if (!open) return null

  /** @param {import('../../../hooks/useExplorerTree.js').SearchEntry} entry */
  function select(entry) {
    if (entry.type === 'sheet') {
      onOpenSheet({ id: entry.id, title: entry.name })
    } else {
      onNavigateSubject(entry.subjectId)
    }
    onClose()
  }

  /** @param {React.KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((current) => Math.min(current + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && results[selected]) {
      event.preventDefault()
      select(results[selected])
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[15vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Buscar"
      >
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setSelected(0)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar una hoja, materia, unidad o tema…"
          aria-label="Buscar"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-text outline-none placeholder:text-text-muted"
        />

        <ul className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-text-muted">Sin resultados.</li>
          )}
          {results.map((entry, index) => (
            <li key={`${entry.type}:${entry.id}`}>
              <button
                type="button"
                onClick={() => select(entry)}
                onMouseEnter={() => setSelected(index)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  index === selected ? 'bg-accent/15 text-accent' : 'text-text hover:bg-surface-2'
                }`}
              >
                <span aria-hidden="true">{ICONS[entry.type]}</span>
                <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                {entry.path.length > 0 && (
                  <span className="shrink-0 truncate text-xs text-text-muted">{entry.path.join(' › ')}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
