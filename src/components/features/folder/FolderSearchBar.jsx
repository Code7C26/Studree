/**
 * Buscador de la carpeta: busca en TODAS las hojas de la materia, muestra
 * "n de m" y navega entre coincidencias. Ver docs/features/folder.md.
 * Presentacional: el término y la coincidencia actual los maneja la página.
 */

import { useEffect, useRef } from 'react'
import { Icon } from '../../ui/Icon'

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
    <div className="flex items-center gap-1 rounded-lg bg-bg/60 px-2 focus-within:ring-1 focus-within:ring-accent-soft">
      <Icon name="search" className="text-text-muted" />
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
      {counter && <span className="shrink-0 text-xs tabular-nums text-text-muted">{counter}</span>}
      <button
        type="button"
        onClick={onPrevious}
        disabled={total === 0}
        aria-label="Coincidencia anterior"
        className="rounded p-1 text-text-muted hover:text-text disabled:opacity-40"
      >
        <Icon name="arrow-up" size={14} />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={total === 0}
        aria-label="Coincidencia siguiente"
        className="rounded p-1 text-text-muted hover:text-text disabled:opacity-40"
      >
        <Icon name="arrow-down" size={14} />
      </button>
    </div>
  )
}
