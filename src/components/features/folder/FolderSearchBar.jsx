/**
 * Buscador de la carpeta: busca en TODAS las hojas de la materia, muestra
 * "n de m" y navega entre coincidencias. Ver docs/features/folder.md.
 * Presentacional: el término y la coincidencia actual los maneja la página.
 */

import { useEffect, useRef } from 'react'

/**
 * @param {Object} props
 * @param {string} props.term
 * @param {(term: string) => void} props.onTermChange
 * @param {number} props.total - Coincidencias en toda la carpeta.
 * @param {number|null} props.current - Índice global de la actual (0-based).
 * @param {() => void} props.onNext
 * @param {() => void} props.onPrevious
 * @param {() => void} props.onClose
 * @param {number} props.focusSignal - Cambia para pedir foco (ej. Ctrl+F).
 */
export function FolderSearchBar({ term, onTermChange, total, current, onNext, onPrevious, onClose, focusSignal }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (focusSignal > 0) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [focusSignal])

  /** @param {React.KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (event.shiftKey) onPrevious()
      else onNext()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  const counter = term.trim() ? (total === 0 ? 'Sin resultados' : `${(current ?? 0) + 1} de ${total}`) : ''

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-bg px-2 focus-within:border-accent">
      <span aria-hidden="true" className="text-sm">
        🔍
      </span>
      <input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(event) => onTermChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Buscar en la materia…"
        aria-label="Buscar en la materia"
        className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-text-muted"
      />
      {counter && <span className="shrink-0 text-xs text-text-muted">{counter}</span>}
      <button
        type="button"
        onClick={onPrevious}
        disabled={total === 0}
        aria-label="Coincidencia anterior"
        className="rounded px-1 text-text-muted hover:text-text disabled:opacity-40"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={total === 0}
        aria-label="Coincidencia siguiente"
        className="rounded px-1 text-text-muted hover:text-text disabled:opacity-40"
      >
        ↓
      </button>
    </div>
  )
}
